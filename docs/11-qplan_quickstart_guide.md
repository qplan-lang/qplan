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
import { buildAIPlanPrompt, setUserLanguage } from "qplan";

const requirement = "Mike starts next Monday—prepare everything he needs.";
setUserLanguage("en"); // use any language string you prefer
const prompt = buildAIPlanPrompt(requirement);
// Contains grammar summary, modules from registry.list(), etc.
```

Send the prompt to the LLM and it will output a **step-based QPlan script**.

Conceptual example:

```qplan
step id="fetch_profile" desc="Fetch Mike's info" {
  getEmployee name="Mike" start_date="2025-12-15" -> data
  return employee=data
}

step id="prepare_assets" desc="Prepare equipment & accounts" {
  allocateDevices employee=fetch_profile.employee devices="laptop,monitor" -> gear
  provisionAccounts employee=fetch_profile.employee systems="email,slack,vpn" -> accounts
  return gear accounts
}

step id="schedule" desc="Create onboarding schedule" {
  scheduleMeeting title="Mike onboarding" attendees=fetch_profile.employee.manager date="Next Monday 10am" -> mtg
  assignMentor employee=fetch_profile.employee -> mentor
  return meeting mentor
}

step id="notify" desc="Notify HR" {
  notifyHR employee=fetch_profile.employee gear=prepare_assets.gear meeting=schedule.meeting mentor=schedule.mentor
}
```

---

## 4. Execute via the QPlan engine

Run the AI-generated script directly:

```ts
const qplanScript = "..."; // Script from the AI
const ctx = await runQplan(qplanScript, {
  registry, // optional custom ModuleRegistry
  env: { userId: session.userId },
  metadata: { requestId: trace.id },
  params: { keyword: "foo" },
  stepEvents: {
    onPlanStart(plan) { ui.showPlanStart(plan); },
    onStepStart(info, context) { ui.showStepStart(info, context?.env); },
    onStepEnd(info, result) { ui.showStepEnd(info, result); },
    onStepError(info, error) { ui.showStepError(info, error); },
    onPlanEnd(plan) { ui.showPlanEnd(plan); },
  }
});
```

QPlan runs each step sequentially, invoking your modules and emitting step events for UIs/logging/alerts. If the script needs external inputs, declare them via `@params` in the script and pass values through `params`.

Need to render the step tree before or during execution? Wrap the script in the `QPlan` object instead:

```ts
import { QPlan } from "qplan";

const qplan = new QPlan(qplanScript, { registry });
qplan.getStepList();        // [{ id, desc, path, status, ... }]
qplan.validate();           // same result as validateQplanScript
await qplan.run({
  registry,
  stepEvents: {
    onStepStart(info) { /* status auto-updates; just log */ },
  },
});
```

`qplan.getStepList()` returns a stable array whose entries change status (pending → running → completed/error, etc.) as `run()` progresses, enabling dashboards to stay in sync without extra plumbing.

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
