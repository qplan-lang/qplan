# 09-ai-integration.md

## 1. Goal
QPlan targets the “AI writes, engine executes” workflow. This guide explains the info needed for LLM integration, how to use `buildAIPlanPrompt`/`buildQplanSuperPrompt`, and how to prepare module metadata.

## 2. Minimum data to provide
```ts
const modules = registry.list();
```
`registry.list()` returns `id`, `description`, `usage`, and `inputs`, forming the core module guide for the LLM. Richer metadata leads to more accurate QPlan code.

## 3. buildAIPlanPrompt() workflow
```ts
import { buildAIPlanPrompt, runQplan, registry, setUserLanguage } from "qplan";

registry.register(customModule);
setUserLanguage("en"); // pass any language string, e.g., "ja"
const prompt = buildAIPlanPrompt("Read a file and compute the average", { registry });
const aiScript = await callLLM(prompt);
const ctx = await runQplan(aiScript, {
  registry,
  env: { tenant: "acme" },
  metadata: { requestId: "req-42" },
  params: { keyword: "foo" },
});
console.log(ctx.toJSON());
```
`buildAIPlanPrompt(requirement, { registry, language })` embeds:
1. QPlan overview and key rules (e.g., actions only inside steps).
2. AI-friendly grammar summary from `buildAIGrammarSummary()`.
3. Module metadata from `registry.list()` (including `usage`).
4. Execution rules/output format covering onError, jumps, dot paths, params, etc.

With this prompt, the LLM outputs step-based QPlan scripts only.
If external inputs are required, instruct the LLM to declare them via `@params` (single line, comma-separated) so validation passes.

## 4. buildQplanSuperPrompt()
Use `buildQplanSuperPrompt(registry)` for long-lived system prompts. It packs QPlan philosophy, engine structure, grammar summary, and module lists into a “super prompt.” Longer than `buildAIPlanPrompt`, but ideal for multi-turn or agent setups.

## 5. Prompt design tips
- **Clarify module description/usage**: the AI reads them verbatim, so show real QPlan examples.
- **Register only needed modules**: keeping the registry lean shortens prompts and prevents misuse.
- **Template requirements**: clean up user requests before passing them as `requirement` for better context.
- **Language**: call `setUserLanguage("<language>")` (any string) or pass `{ language: "<lang>" }` when calling `buildAIPlanPrompt()` so AI strings use the desired language.
- **Reinforce output format**: buildAIPlanPrompt already says “output QPlan only,” but repeating the rule in system/user prompts adds safety.

## 6. Validate before running
Always inspect AI-generated scripts before execution.
```ts
import { validateQplanScript } from "qplan";

const result = validateQplanScript(aiScript);
if (!result.ok) {
  console.error("invalid script", result.error, result.line);
  return;
}
await runQplan(aiScript);
```
- Catch grammar/step/jump issues with `validateQplanScript` before execution.
- CI pipelines can run `npm run validate -- script.qplan` for automated checks.

## 7. Step events for monitoring
`runQplan(script, { stepEvents })` (or `qplan.run({ ... })` if you wrapped the script with `new QPlan(script)`) lets you subscribe to plan start/end plus step start/end/error/retry/jump events. Each callback receives a `StepEventRunContext` so you can correlate user/session data without extra closures. Use them to visualize LLM-generated plans or plan re-runs.

```ts
await runQplan(aiScript, {
  env: { userId: "user-88" },
  stepEvents: {
    onPlanStart(plan, context) {
      log(`plan ${plan.runId} with ${plan.totalSteps} steps`, context?.env);
    },
    onStepStart(info, context) { log(`start ${info.stepId}`, info.path, context?.metadata); },
    onStepError(info, err) { alert(`error ${info.stepId}: ${err.message}`); },
    onPlanEnd(plan) { log(`plan done ${plan.runId}`); }
  }
});
```

## 8. Recommended strategy
1. Register only core + necessary modules, expose `registry.list()` to the LLM.
2. Use `buildAIPlanPrompt(requirement)` to structure the user request.
3. Validate/execute the AI output via `validateQplanScript` and `runQplan` (or the `QPlan` wrapper when you need long-lived step metadata).
4. Surface step events and ctx results in the UI/backend to show progress and success.

Following this flow delivers the “AI thinks, QPlan executes” pattern quickly.

## 9. Validation-aware retry loop
LLM plans occasionally violate grammar or reference missing variables. Keep the agent aligned by inserting a validator gate:

1. **Generate** – Call your model with `buildAIPlanPrompt`.
2. **Validate** – Run `const result = validateQplanScript(script)`.
   - `result.ok === true`: execute with `runQplan`.
   - `result.ok === false`: read `result.error` and `result.issues`. Each issue now includes a `line` and a `hint` explaining what to fix (“Create 'total' before using it”, “jump target 'cleanup' not found”, etc.).
3. **Retry prompt** – Feed the hint back to the LLM as feedback (“Previous plan invalid: jump target 'cleanup' not found. Please add that step or change the jump.”) and ask for a corrected script.
4. **Limit & log** – Impose a retry cap, store failing scripts plus hints for debugging/audit, and surface them to users if manual intervention is needed.

This loop lets the LLM quickly converge on a valid plan without risking runtime errors.
