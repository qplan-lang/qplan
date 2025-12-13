# 01-overview.md
**QPlan Language — AI Planning Language & Execution Engine**

## 🚀 What is QPlan?
QPlan is a **step-based workflow language/engine that lets AI design plans and humans validate them**. An LLM turns natural-language requirements into a QPlan script, and the engine executes that script safely to perform real-world tasks (file I/O, data processing, external calls, and more).

Core goals:
- **Simple**: even a single-line command can run immediately, and the grammar fits on one page (`docs/02-grammar.md`).
- **Composable**: steps/sub-steps, jump, and onError let you structure complex flows.
- **AI-Friendly**: registry metadata plus an AI-oriented grammar summary help models generate scripts automatically.
- **Extensible**: writing an ActionModule is all it takes to plug into the registry.
- **Deterministic & Observable**: step order/path/event logging makes every run reproducible and traceable.
- **Future-proof**: Future/Parallel/Join, dot-path variable references, and other modern controls are first-class.

> **AI thinks, QPlan executes.**

## 🧩 Engine components
1. **Tokenizer & Parser**—`src/core/tokenizer.ts` and `parser.ts` tokenize the script and convert it into an AST (Action/If/Parallel/Each/Step/Jump, etc.). The parser enforces that actions and control structures only appear inside steps.
2. **Semantic Validator & Step Resolver**—`semanticValidator.ts` verifies jump/onError targets and returns warning lists. `stepResolver.ts` analyzes the step tree to compute order/path/parent relationships.
3. **Executor & StepController**—`executor.ts` runs the AST sequentially or in parallel and handles Future/Join/Parallel/Each/While/Jump/Return/Set. `stepController.ts` manages onError policies (fail/continue/retry/jump), retry loops, and step event emission.
4. **ExecutionContext (ctx)**—`executionContext.ts` provides `set/get/has/toJSON` for runtime state storage. It supports dot-path access (e.g., `stats.total`) so sub-fields of step results are immediately reusable.
5. **ModuleRegistry & ActionModule**—`moduleRegistry.ts` manages registration, lookup, and metadata extraction. ActionModules can be functions or objects with an `execute()` method, optionally including `id/description/usage/inputs`. `src/index.ts` exports `registry` and auto-registers `basicModules`.
6. **Prompt Builders**—`buildAIPlanPrompt`, `buildQplanSuperPrompt`, and `buildAIGrammarSummary` combine registry metadata and grammar summaries to dynamically craft system/user prompts for LLMs.

## 🪜 Step system & execution rules
- **Actions always run inside steps**. The root level contains only `step` blocks, and actions/control statements (If/While/Each/Parallel/Jump, etc.) appear inside them.
- Steps follow `step id="..." desc="..." type="..." onError="..." -> result { ... }`. `type` tags the UI, and `onError` supports fail (default), continue, retry=N, or jump="stepId".
- Use `return key=value ...` inside a step to build an explicit result; otherwise, the last action result becomes the step result.
- `jump to="stepId"` moves between steps. Targets must be step IDs, and the semantic validator ensures they exist.
- Steps can nest (sub-steps). The resolver auto-assigns `order` (execution sequence) and `path` (e.g., `1.2.3`).
- When calling `runQplan`, `stepEvents` hooks let you observe step execution in real time.

```ts
import { runQplan } from "qplan";

await runQplan(script, {
  stepEvents: {
    onStepStart(info) { console.log("▶", info.order, info.stepId, info.desc); },
    onStepEnd(info, result) { console.log("✓", info.stepId, result); },
    onStepError(info, err) { console.error("✗", info.stepId, err.message); },
    onStepRetry(info, attempt) { console.warn("retry", info.stepId, attempt); },
    onStepJump(info, target) { console.log("jump", info.stepId, "→", target); }
  }
});
```

## 🔄 Control flow & language features
- **If / While**—conditions support `> < >= <= == != EXISTS NOT_EXISTS`, logical `AND/OR/not`, and parentheses. While loops reuse the same condition syntax.
- **Each**—`each item in iterable { ... }` or `each (item, idx) in iterable { ... }` iterates arrays, with `stop`/`skip` available inside.
- **Parallel**—`parallel concurrency=3 ignoreErrors=true { ... }` runs a block in parallel.
- **Future & Join**—the `future` module stores a Promise in ctx under a `__future` wrapper, and `join futures="f1,f2" -> list` combines multiple futures.
- **Set & Return**—`set total = (total + delta) * 0.5` applies arithmetic expressions to existing variables, and `return key=value ...` shapes step outputs manually.
- **Stop / Skip**—control exit/continue in Each or While loops.
- **ExecutionContext**—`ctx.get("order.summary.status")` reads nested values via dot paths, and `ctx.toJSON()` dumps the entire state.
- **Full grammar** lives in `docs/02-grammar.md`; `buildAIGrammarSummary()` auto-generates a condensed, LLM-friendly version.

## 📦 Built-in modules (basicModules)
The default registry auto-registers nine modules (`src/modules/index.ts`):
- **var**—stores string/number/JSON literals in ctx variables. Use `set` to copy existing values.
- **print**—`console.log` style output mixing strings/numbers/ctx variables; returns the last printed value.
- **echo**—returns inputs as an object for debugging.
- **sleep**—waits for the given ms and returns `"slept Xms"`.
- **file**—`op=read/write` reads or writes files, JSON-serializing objects on write.
- **math**—provides `add/sub/mul/div/sum/avg`; `arr` accepts JSON arrays or whitespace/comma-delimited strings.
- **future**—creates async futures and stores promises in ctx (`{ __future: Promise }`).
- **join**—`futures="a,b,c"` resolves multiple futures via `Promise.all`.
- **json**—`parse/stringify/get/set/keys/values/entries` utilities with auto-parsing for string inputs.

## ➕ Extension modules & registry usage
Additional modules (`ai`, `http`, `html`, `string`, `timeout`, etc.) live under `src/modules/basic/*.ts`. They are excluded from the default bundle, so import and register them manually when needed.

```ts
import { registry } from "qplan";
import { httpModule } from "qplan/dist/modules/basic/http.js"; // or import from src

registry.register(httpModule);
registry.registerAll([htmlModule, stringModule, aiModule]);
```

Modules can be functions or objects like `{ execute(inputs, ctx) { ... } }`. When `inputs` metadata is defined, `buildAIPlanPrompt()` automatically injects usage hints into the AI prompt.

## 🤖 AI integration features
- **buildAIPlanPrompt(requirement)**—builds a prompt with registered modules, grammar summary, and execution rules, instructing the LLM to “write QPlan code only.” onError, jump, and dot-path rules are all spelled out.
- **buildQplanSuperPrompt(registry)**—creates the LLM system prompt: QPlan philosophy, engine structure, grammar summary, and module metadata rolled into a “master guide.”
- **buildAIGrammarSummary()**—compresses the long grammar doc into AI-friendly prose.

```ts
import { buildAIPlanPrompt, registry } from "qplan";

registry.register(customModule);
const prompt = buildAIPlanPrompt("Create an inventory summary report");
const aiScript = await callLlm(prompt);
```

Scripts generated this way can run immediately via `runQplan` or be pre-validated with `validateQplanScript`.

## ✅ Validation & execution tools
- **validateQplanScript(script)**—returns tokenize/parse/semantic-validation results. Success: `{ ok: true, ast }`; failure: `{ ok: false, error, line, issues }`.
- **CLI validator**—`src/tools/validateScript.ts` powers `npm run validate -- examples/12_exam_step.qplan`, inspecting files or stdin (`-`).
- **Semantic Validator**—catches structural errors like missing jump targets or invalid onError="jump" references early.
- **ExecutionContext debugging**—`ctx.toJSON()` dumps the full variable state for UI/log inspection.
- **Step Events**—UI/monitoring systems can subscribe to start/end/error/retry/jump events to build Gantt views, progress meters, or audit logs.

## 🧪 Example run
Below is a simple step-based pipeline that uses only the basic modules.

```
step id="load" desc="Load data" -> dataset {
  file read path="./data/raw.json" -> rawTxt
  json parse data=rawTxt -> parsed
  return list=parsed
}

step id="aggregate" desc="Sum & average" -> stats {
  var 0 -> total
  each value in dataset.list {
    set total = total + value
  }
  math avg arr=dataset.list -> average
  return total=total average=average
}

step id="report" desc="Print result" onError="continue" {
  print message="Average" value=stats.average
  echo summary="done" total=stats.total avg=stats.average -> final
  return result=final
}
```

## 📌 Design philosophy
1. **Module-centric extensibility**—write an ActionModule once and it automatically feeds execution plans, prompts, and validation.
2. **AI-first grammar**—rules that AIs often mis-handle (step-only actions, dot-paths, Future/Parallel, etc.) are documented explicitly and reiterated via the prompt builders.
3. **Observability**—step trees, order/path, event hooks, and ctx dumps capture the entire execution trail.
4. **Keep it simple**—express diverse control flows with minimal syntax while implementing heavy lifting in TypeScript modules.
5. **Deterministic execution**—identical scripts + ctx + modules always yield identical results.

This document presents the big-picture view of QPlan. For the full grammar/EBNF see `docs/02-grammar.md`, and browse `examples/` for module usage and sample scripts.
