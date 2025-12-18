# 03-architecture.md

## 1. System overview
QPlan is a step-based workflow engine built for the **“LLM writes → engine executes”** scenario. A QPlan script flows through Tokenizer → Parser → Semantic Validator → Step Resolver → Executor, and every intermediate value is stored in the ExecutionContext (ctx). The components below live in `src/`, and external callers access them via `runQplan`, `registry`, `buildAIPlanPrompt`, etc.

```
Script
  ↓ tokenize()              (src/core/tokenizer.ts)
Tokens
  ↓ Parser.parse()          (src/core/parser.ts)
ASTRoot
  ↓ validateSemantics()     (src/core/semanticValidator.ts)
Validated AST + StepResolution
  ↓ Executor.run()          (src/core/executor.ts)
ExecutionContext (variables, futures, step outputs)
```

## 2. Core components
| Component | Description | Key files |
| --- | --- | --- |
| Tokenizer | Breaks scripts into tokens; recognizes strings, numbers, JSON, identifiers, keywords. | `src/core/tokenizer.ts` |
| Parser | Converts tokens into AST nodes (Action, If, While, Each, Parallel, Step, Jump, etc.), verifying all actions/control statements are inside steps and handling var/print syntax. | `src/core/parser.ts`, `src/core/ast.ts` |
| Semantic Validator | Pre-checks duplicate step IDs, ensures onError="jump" targets and `jump to` targets exist, and returns issues. | `src/core/semanticValidator.ts` |
| Step Resolver / Controller | Computes order/path/parent relationships for the step tree and, during execution, manages onError policies (fail/continue/retry/jump) plus plan/step events (`onPlanStart/End`, `onStepStart/End/Error/Retry/Jump`). | `src/step/stepResolver.ts`, `src/step/stepController.ts`, `src/step/stepEvents.ts` |
| Executor | Runs the AST sequentially/parallel, handling If/While/Each/Parallel/Jump/Set/Return/Future/Join/Stop/Skip and updating the ExecutionContext. | `src/core/executor.ts` |
| ExecutionContext | Runtime store offering ctx.set/get/has/toJSON plus `ctx.getEnv()` / `ctx.getMetadata()` for per-run context. Supports dot-path access (`stats.total`) so sub-fields of step outputs can be reused. | `src/core/executionContext.ts` |
| ModuleRegistry | Manages ActionModule registration/lookup/metadata exposure. Each `ModuleRegistry` seeds the default basic modules (unless `{ seedBasicModules: false }` is passed). | `src/core/moduleRegistry.ts`, `src/index.ts` |
| ActionModule | Function-style or `{ execute(inputs, ctx) {} }` modules. Metadata `id/description/usage/inputs` powers docs and LLM prompts. | `src/core/actionModule.ts` |
| Prompt Builders | `buildAIPlanPrompt`, `buildQplanSuperPrompt`, `buildAIGrammarSummary` combine registered modules and grammar summaries into LLM prompts. | `src/core/buildAIPlanPrompt.ts`, `src/core/buildQplanSuperPrompt.ts`, `src/core/buildAIGrammarSummary.ts` |

## 3. Step system architecture
1. **Step definition** – `step id="..." desc="..." type="..." onError="..." { ... }`. The parser reads the header, validates the ID, and builds a StepNode.
2. **Step resolution** – Before execution, `resolveSteps()` walks the tree to compute `order`, `path`, `parent`, and `errorPolicy` metadata, plus a StepID → StepNode map.
3. **StepController** – When the executor runs a step, the controller handles:
   - Emitting onStepStart/End/Error/Retry/Jump events (supplied via `stepEvents`).
   - `onError="continue"`: end the step on error and move on.
   - `onError="retry=N"`: retry up to N times, calling onStepRetry each attempt.
   - `onError="jump='cleanup'"`: raise a JumpSignal to another step.
4. **Jump handling** – `jump to="stepId"` statements or onError jumps throw JumpSignals; the executor updates block overrides to restart loops/blocks accordingly.
5. **Step result** – If the step block contains `return`, that object becomes the result; otherwise, the final action result becomes the step result. Either way, the executor stores it under `ctx[runId][namespace]`, where `namespace` defaults to the step ID (override with `step ... -> resultVar`), and mirrors the same object under the original step ID so later steps can reference either `namespace.field` or `stepId.field`.

## 4. Module structure
- **Default bundle** – `src/modules/index.ts` registers nine modules (`var/print/echo/sleep/file/math/future/join/json`) into the default registry.
- **Extension modules** – `src/modules/basic/*.ts` contains optional modules (http, html, string, ai, timeout, etc.) that can be activated via `registry.register()`.
- **ActionModule execution** – The executor fetches a module, calls it directly if it’s a function or `mod.execute()` if it’s an object. When a future module returns `{ __future: Promise }`, only the promise is stored in ctx so join can consume it.

## 5. Prompt / AI integration
1. **buildAIPlanPrompt(requirement, { registry, language })** – Bundles registered module metadata, AI-friendly grammar summary, execution rules, and user requirements into a prompt telling the LLM to “output QPlan only,” using whichever registry/language you provide.
2. **buildQplanSuperPrompt(registry)** – System-level prompt describing QPlan philosophy, architecture, modules, and grammar summary.
3. **buildAIGrammarSummary()** – Produces a lightweight grammar synopsis versus the full `docs/02-grammar.md`, reducing LLM input size.

## 6. ExecutionContext & data flow
- **Store** – Save action or step results via `ctx.set(name, value)`.
- **Read** – When another action passes a string argument, it auto-binds if the ctx has a matching name. `ctx.has/ctx.get` support dot paths, so returning `stats={ total, count }` lets you reuse `stats.total`.
- **Dump** – `ctx.toJSON()` dumps the entire state for logging/debugging.

## 7. Tooling & validation
- **validateQplanScript(script)** – Returns tokenize/parse/semantic-validation results; `{ ok: true, ast }` on success, `{ ok: false, error, line, issues? }` on failure.
- **CLI** – `npm run validate -- <file>` (backed by `src/tools/validateScript.ts`) checks files or stdin for CI/editor integrations.
- **Step events** – `runQplan(script, { env, metadata, stepEvents })` lets observers mirror plan start/end plus step progress into UIs/logs/monitoring while sharing run context with callbacks.

## 8. Extension & integration points
1. **Add modules** – Implement an ActionModule and call `registry.register(customModule)`. With metadata filled in, prompt builders automatically include usage info.
2. **Custom executor hooks** – Use `stepEvents` to capture plan+step start/end/error/retry/jump events (receiving `StepEventRunContext`) and feed Gantt charts, progress, or audit logs.
3. **LLM integration** – Generate prompts via `buildAIPlanPrompt` (optionally calling `setUserLanguage("<language>")` with any string beforehand) and execute with `runQplan` to realize “AI thinks, QPlan executes.”
4. **Further docs** – See `docs/02-grammar.md`, `docs/06-executor.md`, `docs/10-step-system.md`, etc., for deeper extension strategies.

## 9. Summary diagram
```
+---------------------+
|  QPlan Script       |
+---------------------+
          |
          v tokenize()
+---------------------+
| Tokenizer           |
+---------------------+
          |
          v Parser.parse()
+---------------------+
| AST (Action/Step/...)|
+---------------------+
          |
          v resolveSteps() + validateSemantics()
+---------------------+
| StepResolution      |
+---------------------+
          |
          v Executor.run()
+---------------------+
| StepController +    |
| ExecutionContext    |
+---------------------+
          |
          v
+---------------------+
| ctx variables /     |
| step events / logs  |
+---------------------+
```

This architecture delivers concise grammar, step-based control, and module extensibility so AI and humans can co-design and run workflows.
