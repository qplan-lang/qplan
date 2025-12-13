# QPlan QuickStart Guide — The Easiest Path to AI-Driven Execution

## 1. What does QPlan do?

LLMs excel at understanding natural language but cannot **execute real system actions**. Requests like “search for products” or “perform a payment” result in descriptions, not actions.

**QPlan is a lightweight AI planning language and execution engine built to close this gap.**

- Ask the AI to “write an execution plan using QPlan.”
- The AI writes a step-based workflow.
- QPlan executes the plan step-by-step like code.
- Your modules—search, filtering, payments, etc.—run inside those steps.

In other words,  
**AI thinks (writes the QPlan), and QPlan executes.**

---

## 2. Ultra-simple summary

Imagine this flow:

- User:  
  > “Mike is joining next Monday—please make sure he’s ready to start.”
- Your system:  
  QPlan + AI coordinate a plan, running each step (gather info → prep equipment/accounts → schedule onboarding → report progress).
- Result:  
  → **Onboarding ready**

That’s QPlan’s core value: users speak naturally, the AI writes the plan, and QPlan executes it.

---

## 3. What developers need to prepare

To adopt QPlan, you only need two things.

---

### ✔ 1) Prepare and register feature modules

Wrap existing system functions as ActionModules and register them in the ModuleRegistry.

Example:

```ts
import { registry } from "qplan";

export const searchModule = {
  id: "search",
  description: "Search products",
  inputs: ["keyword"],
  async execute({ keyword }) {
    return await searchFromDB(keyword);
  }
};

registry.registerAll([
  searchModule,
  filterModule,
  askUserModule,
  paymentModule
]);
```

Clear IDs/descriptions/inputs help the AI understand what’s available.

---

### ✔ 2) Request execution plans from AI based on user requests

QPlan provides helpers to build LLM prompts from requirements.

```ts
import { buildAIPlanPrompt } from "qplan";

const requirement = "Mike starts next Monday—prepare everything he needs.";
const prompt = buildAIPlanPrompt(requirement);
// Contains grammar summary, modules from registry.list(), etc.
```

Send the prompt to the LLM and it will output a **step-based QPlan script**.

Conceptual example:

```qplan
step id="fetch_profile" desc="Fetch Mike's info" -> profile {
  getEmployee name="Mike" start_date="2025-12-15" -> data
  return employee=data
}

step id="prepare_assets" desc="Prepare equipment & accounts" -> assets {
  allocateDevices employee=profile.employee devices="laptop,monitor" -> gear
  provisionAccounts employee=profile.employee systems="email,slack,vpn" -> accounts
  return gear=gear accounts=accounts
}

step id="schedule" desc="Create onboarding schedule" -> plan {
  scheduleMeeting title="Mike onboarding" attendees=profile.employee.manager date="Next Monday 10am" -> mtg
  assignMentor employee=profile.employee -> mentor
  return meeting=mtg mentor=mentor
}

step id="notify" desc="Notify HR" {
  notifyHR employee=profile.employee gear=assets.gear meeting=plan.meeting mentor=plan.mentor
}
```

---

## 4. Execute via the QPlan engine

Run the AI-generated script directly:

```ts
const qplanScript = "..."; // Script from the AI
const ctx = await runQplan(qplanScript, {
  stepEvents: {
    onStepStart(info) { ui.showStepStart(info); },
    onStepEnd(info, result) { ui.showStepEnd(info, result); },
    onStepError(info, error) { ui.showStepError(info, error); }
  }
});
```

QPlan runs each step sequentially, invoking your modules and emitting step events for UIs/logging/alerts.

---

## 5. You don’t need to master QPlan’s full language

While the language is rich, most developers only need to know:

1. How to build modules.
2. How to register modules in QPlan.
3. How to use `buildAIPlanPrompt(requirement)` to request execution plans from AI.
4. How to run those plans via `runQplan` and handle step events.

---

## ✨ Conclusion

QPlan delivers:

- A bridge from natural-language requests to real execution.
- Reliable execution of AI-authored plans.
- Simple developer responsibilities: define modules, leverage step events.
- A lightweight workflow engine that attaches to any service.

**In short, QPlan is the simplest, most powerful way to let AI take action.**
