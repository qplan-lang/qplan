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
const registry = new ModuleRegistry();
registry.registerAll([
  searchModule,
  filterModule,
  askUserModule,
  paymentModule
]);
```

### 6.4 Generate AI Plan

```ts
import { buildAIPlanPrompt, setUserLanguage } from "qplan";

setUserLanguage("en"); // pass any language string, e.g., "ko", "ja"
const requirement = "Buy a white T-shirt with a bear on it";
const prompt = buildAIPlanPrompt(requirement);

const aiScript = await callLLM(prompt);
```

### 6.5 Execute the Plan

```ts
const ctx = await runQplan(aiScript, {
  stepEvents: {
    onStepStart(info) { console.log("start:", info.stepId); },
    onStepEnd(info, result) { console.log("done:", info.stepId, result); },
    onStepError(info, error) { console.error("error:", info.stepId, error); },
    onStepRetry(info, attempt, error) {},
    onStepJump(info, targetStepId) {},
  }
});
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
Central place where modules are registered and exposed to AI and runtime.

### Step System
Structured workflow with sub-steps, jump policies, retry logic, and error handling.

### ExecutionContext
Stores runtime variables and supports dot-path access like `stats.total` or `order.detail.id`.

### Flow Control
Includes `if`, `while`, `each`, `parallel`, `future`, `join`, `jump`, `skip`, `stop`.

## 9. API Overview

- **runQplan(script, options)** – Executes QPlan  
- **buildAIPlanPrompt(requirement)** – Creates AI-friendly planning prompt  
- **registry** – Registers modules and returns metadata  
- **validateQplanScript(script)** – Syntax & semantic validator  

## 10. Grammar Summary

- `action key=value -> var`
- `step id="..." desc="..." { ... }`
- Conditionals, loops, async, parallel
- Dot-path referencing

## 11. License
MIT

## 12. Contribute
PRs and issues welcome. Modules, examples, improvements are appreciated.
