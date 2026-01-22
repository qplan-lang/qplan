# QPlan
AI Planning Language & Execution Engine 

https://qplan.org

## QuickStart

```bash
npm install qplan
```

```ts
import { buildAIPlanPrompt, runQplan, registry } from "qplan";
// TODO: registry.register(askUserModule); registry.register(saveDbModule);

const requirement = "Ask the user for their name, then save it to the developer database.";
const prompt = buildAIPlanPrompt(requirement);

// TODO: call your LLM here
const aiScript = await callAnyLLM(prompt);

const ctx = await runQplan(aiScript, { registry });
console.log(ctx);
```

### Example AI-generated QPlan
```qplan
step id="ask_name" {
  askUser prompt="What is your name?" -> name
}

step id="save_user" {
  saveDb name=name
}
```


## 1. Introduction

QPlan is a **lightweight AI Planning Language & Execution Engine** designed for scenarios where an AI writes a plan and the system executes it.
It transforms natural-language requests into **step-based executable workflows** for data processing, automation, and more.

Typical LLMs can describe what to do but cannot execute real operations.
QPlan solves this by letting the AI generate a QPlan script that the engine runs safely.

> **AI thinks, QPlan executes.**

## 3. Why QPlan?

### 3.1 Problem
AI understands requests like “Buy a white T-shirt with a bear on it,” but cannot perform actions such as search, filtering, or payment.

### 3.2 Solution
QPlan workflow:
1. User request  
2. `buildAIPlanPrompt()` generates the AI planning prompt  
3. AI outputs a step-based QPlan plan  
4. QPlan executes steps  
5. Results are returned to UI/backend

## 4. Simple Example

**User:**  
“Buy a white T-shirt with a bear on it.”

**System Workflow (QPlan + AI):**
1. Search white T-shirts  
2. Filter by bear print  
3. User selects an item  
4. Execute payment  

→ Purchase completed.

## 5. How It Works (High-Level)

```
User Request
    ↓
buildAIPlanPrompt()
    ↓
AI generates QPlan script
    ↓
runQplan(script)
    ↓
Steps execute (search/filter/choice/payment)
```

## 6. QuickStart

### 6.1 Install

```bash
npm install qplan
```

### 6.2 Create a Module

```ts
export const searchModule = {
  id: "search",
  description: "Search products",
  inputs: ["keyword"],
  inputType: { keyword: "string" },
  outputType: { items: [{ id: "string", title: "string" }] },
  async execute({ keyword }, ctx) {
    const locale = ctx.get("userLocale"); // ctx/env metadata passed via runQplan options
    return await searchDB(keyword, { locale });
  }
};
```
String arguments that match a ctx variable name (e.g., `keyword=queryResult.value`) are automatically resolved to the stored value, and every module receives the same `ctx` instance so it can call `ctx.has/ctx.get`. See [`docs/08-writing-modules.md`](docs/08-writing-modules.md) for the full module guide.

### 6.3 Register Modules

```ts
// Easiest: reuse the built-in global registry
import { registry } from "qplan";
registry.register(searchModule);
registry.registerAll([filterModule, askUserModule, paymentModule]);

// Need full control? create your own registry instance
const customRegistry = new ModuleRegistry(); // basicModules auto-registered
customRegistry.registerAll([
  searchModule,
  filterModule,
  askUserModule,
  paymentModule
]);
// Need a blank registry? use new ModuleRegistry({ seedBasicModules: false }).
```

### 6.4 Generate AI Plan

```ts
import { buildAIPlanPrompt, setUserLanguage } from "qplan";

setUserLanguage("en"); // pass any language string, e.g., "ko", "ja"
const requirement = "Buy a white T-shirt with a bear on it";
const prompt = buildAIPlanPrompt(requirement, { registry });

const aiScript = await callLLM(prompt);
```

`buildAIPlanPrompt` accepts `{ registry, language }`, so the AI sees exactly the modules you expose and strings are generated in your preferred language.

### 6.5 Execute the Plan

```ts
const ctx = await runQplan(aiScript, {
  registry, // optional custom registry
  env: { userId: "u-123" },
  metadata: { sessionId: "s-456" },
  params: { keyword: "foo", item: { aaa: 1 } },
  stepEvents: {
    onPlanStart(plan, context) {
      console.log("▶ plan started", plan.totalSteps, context.env?.userId);
    },
    onStepStart(info, context) {
      console.log("start:", info.stepId, "depth:", info.depth, context.metadata);
    },
    onStepEnd(info, result) {
      console.log("done:", info.stepId, "result:", result);
    },
    onStepRetry(info, attempt, error) {
      console.warn("retry:", info.stepId, "attempt", attempt, error.message);
    },
    onStepJump(info, targetStepId) {
      console.log("jump:", info.stepId, "→", targetStepId);
    },
    onPlanEnd(plan) {
      console.log("✔ plan finished", plan.runId);
    },
  }
});
```

> 🔗 Want to see this flow end-to-end? Check the fully fleshed out example in [`examples/16_exam_ai_plan.js`](examples/16_exam_ai_plan.js) (LLM retries, validation, and step events in one place).

`stepEvents` entries now receive `(info, result?, context)` so you can correlate runs, inspect depth/path, and read `env`/`metadata` across plan/step hooks. Legacy hooks such as `onStepRetry` and `onStepJump` are still available and receive the same `(info, ...args, context)` signature.

### 6.6 Share Run Metadata with Modules

Use `runQplan(script, { env, metadata })` to attach arbitrary objects (user, session, trace IDs, etc.).  
Use `params` to seed runtime variables so scripts can reference them directly (dot-path and bracket index supported, e.g., `item.aaa`, `items[0]`).
Declare external inputs with `@params` on a single line (comma-separated, whitespace allowed); missing params cause a runtime error.
Modules can read them from the execution context:

```ts
export const auditModule = {
  id: "audit",
  async execute(inputs, ctx) {
    const env = ctx.getEnv() ?? {};
    const metadata = ctx.getMetadata();
    await sendAuditLog({ ...inputs, env, metadata });
  }
};
```

## 7. AI-Generated Example

```qplan
step id="search" desc="Search white T-shirts" {
  search keyword="white T-shirt" -> result
  return list=result
}

step id="filter" desc="Filter for bear print" {
  filter list=search.list pattern="bear" -> out
  return list=out
}

step id="select" desc="User selection" {
  askUser list=filter.list -> sel
  return item=sel
}

step id="checkout" desc="Payment" {
  payment item=select.item
}
```

## 8. Concepts Overview

### ActionModule
Functional or object-based modules used by AI to generate valid plans. Include `inputType`/`outputType` metadata to describe I/O shapes in AI prompts.

### ModuleRegistry
Central place where modules are registered and exposed to AI/runtime. Module IDs may include any Unicode letter/digit plus underscores (e.g., `my_module`, `분석작업`), but must start with a letter/underscore. You can pass a custom registry to `runQplan` or `buildAIPlanPrompt`, and call `listRegisteredModules(registry)` to expose metadata to UIs or prompt builders. Every `new ModuleRegistry()` automatically seeds the default `basicModules`; pass `new ModuleRegistry({ seedBasicModules: false })` if you need an empty registry, or use `seedModules` to preload a custom set.

### Step System
Structured workflow with sub-steps, jump policies, retry logic, and error handling. Return statements are optional: `return gear accounts total=sum` (or `return gear, accounts, total=sum`) automatically expands to `return gear=gear accounts=accounts total=sum`. If you omit `return`, every action output inside the step is exposed under the step’s result namespace (`stepId.outputName` by default, or a custom name when you add `-> resultVar` to the step header). Even when you override the namespace, the engine mirrors the same object under the original step ID, so both `resultVar.field` and `stepId.field` keep working. Identifiers (module names, variables, return keys, etc.) may include any Unicode letter/digit plus `_` so long as they start with a letter or underscore, meaning `return 결과=값` works alongside ASCII names.
You can optionally wrap a script in `plan { ... }` and add `@title`, `@summary`, `@version`, `@since`, or `@params` for human-readable metadata and declared inputs. When you skip the `plan { ... }` wrapper, you can still place `@title`/`@summary`/`@version`/`@since`/`@params` at the top of the script. Single-token meta values can omit quotes; use quotes for multi-word values. `@params` is single-line and comma-separated (whitespace ok), and any missing params cause a runtime error.

### ExecutionContext
Stores runtime variables, supports dot-path and bracket index access (`stats.total`, `items[0]`, arrays support `.length`/`.count`), and keeps per-run `env`/`metadata` values retrievable via `ctx.getEnv()` / `ctx.getMetadata()`. Modules that perform long loops or waits should call `await ctx.checkControl()` periodically to honor pause/abort requests, and can read the current state via `ctx.getExecutionState()`.

### Flow Control
Includes `if`, `while`, `each`, `parallel`, `future`, `join`, `jump`, `skip`, `stop`.

## 9. API Overview

- **runQplan(script, options)** – Executes QPlan scripts. Options include `registry`, `stepEvents`, `env`, `metadata`, and `runId`.
- **QPlan(script, { registry }?)** – Object wrapper that parses/validates once, exposes `getStepList()` for UI rendering, and tracks step lifecycle states while `run()` executes. See `examples/19_exam_qplan_object.js`.
- Comments are available everywhere. Use `// inline`, `# inline`, or `/* block */`. The tokenizer skips them entirely when parsing scripts.
- **buildAIPlanPrompt(requirement, { registry, language })** – Creates AI planning prompts for any registry/language pair.
- **listRegisteredModules(registry?)** – Returns module metadata for prompt builders or dashboards.
- **registry** – Default ModuleRegistry preloaded with built-in modules (file module available only in Node).
- **validateQplanScript(script)** – Syntax & semantic validator.

## 10. Grammar Summary

- `action key=value -> var`
- `step id="..." desc="..." [type="..."] [onError="..."] [-> resultVar] { ... }` (results auto-bind to the step id unless you override it with `-> resultVar`)
- Conditionals (including unary `EXISTS`), loops, async, parallel
- Dot-path & bracket index referencing (with safe access & array properties)

## 11. License
MIT

## 12. Contribute
PRs and issues welcome. Modules, examples, improvements are appreciated.

## 13. Browser Bundles
Vite/Rollup/webpack consume the package’s `"browser"` map, so browser builds load `dist/modules/basic/file.browser.js`, a stub that excludes Node-only `fs/promises` and `path` dependencies. Server/CLI builds still get the real file module automatically.
