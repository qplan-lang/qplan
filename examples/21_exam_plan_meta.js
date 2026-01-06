/**
 * Example 21 – Plan metadata (plan { @title ... })
 * ----------------------------------------------------------------------------
 * Shows how plan metadata can be read from the QPlan object and plan events.
 */
import { QPlan, registry } from "../dist/index.js";

const script = `
plan {
  @title "Onboarding Plan"
  @summary "Create accounts and schedule training"
  @version "0.1"
  @since "2025-01-01"

  step id="setup" desc="Prep accounts" {
    var "ok" -> status
    return status=status
  }
}
`;

const qplan = new QPlan(script, { registry });

console.log("Plan meta from QPlan:", qplan.getPlanMeta());

await qplan.run({
  registry,
  stepEvents: {
    onPlanStart(plan) {
      console.log("Plan start meta:", plan.planMeta);
    },
  },
});
