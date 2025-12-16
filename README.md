# README.md (English Version)

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
  async execute({ keyword }) {
    return await searchDB(keyword);
  }
};
```

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
step id="search" desc="Search white T-shirts" -> items {
  search keyword="white T-shirt" -> result
  return list=result
}

step id="filter" desc="Filter for bear print" -> filtered {
  filter list=items.list pattern="bear" -> out
  return list=out
}

step id="select" desc="User selection" -> chosen {
  askUser list=filtered.list -> sel
  return item=sel
}

step id="checkout" desc="Payment" {
  payment item=chosen.item
}
```

## 8. Concepts Overview

### ActionModule
Functional or object-based modules used by AI to generate valid plans.

### ModuleRegistry
Central place where modules are registered and exposed to AI/runtime. You can pass a custom registry to `runQplan` or `buildAIPlanPrompt`, and call `listRegisteredModules(registry)` to expose metadata to UIs or prompt builders. Every `new ModuleRegistry()` automatically seeds the default `basicModules`; pass `new ModuleRegistry({ seedBasicModules: false })` if you need an empty registry, or use `seedModules` to preload a custom set.

### Step System
Structured workflow with sub-steps, jump policies, retry logic, and error handling.

### ExecutionContext
Stores runtime variables, supports dot-path access (`stats.total`), and keeps per-run `env`/`metadata` values retrievable via `ctx.getEnv()` / `ctx.getMetadata()`.

### Flow Control
Includes `if`, `while`, `each`, `parallel`, `future`, `join`, `jump`, `skip`, `stop`.

## 9. API Overview

- **runQplan(script, options)** – Executes QPlan scripts. Options include `registry`, `stepEvents`, `env`, `metadata`, and `runId`.
- **buildAIPlanPrompt(requirement, { registry, language })** – Creates AI planning prompts for any registry/language pair.
- **listRegisteredModules(registry?)** – Returns module metadata for prompt builders or dashboards.
- **registry** – Default ModuleRegistry preloaded with built-in modules (file module available only in Node).
- **validateQplanScript(script)** – Syntax & semantic validator.

## 10. Grammar Summary

- `action key=value -> var`
- `step id="..." desc="..." { ... }`
- Conditionals, loops, async, parallel
- Dot-path referencing

## 11. License
MIT

## 12. Contribute
PRs and issues welcome. Modules, examples, improvements are appreciated.

## 13. Browser Bundles
Vite/Rollup/webpack consume the package’s `"browser"` map, so browser builds load `dist/modules/basic/file.browser.js`, a stub that excludes Node-only `fs/promises` and `path` dependencies. Server/CLI builds still get the real file module automatically.
