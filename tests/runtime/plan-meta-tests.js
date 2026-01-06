import assert from "node:assert";
import { QPlan, registry } from "../../dist/index.js";

async function testPlanMeta() {
  const script = `
plan {
  @title "Onboarding Plan"
  @summary "Create accounts and schedule training"
  @version "0.1"
  @since "2025-01-01"

  step id="setup" {
    var "ok" -> status
    return status=status
  }
}
`;

  const qplan = new QPlan(script, { registry });
  const meta = qplan.getPlanMeta();
  assert.deepStrictEqual(meta, {
    title: "Onboarding Plan",
    summary: "Create accounts and schedule training",
    version: "0.1",
    since: "2025-01-01",
  });

  let emittedMeta;
  await qplan.run({
    registry,
    stepEvents: {
      onPlanStart(plan) {
        emittedMeta = plan.planMeta;
      },
    },
  });

  assert.deepStrictEqual(emittedMeta, meta, "planMeta should flow through plan events");
}

await testPlanMeta();
console.log("runtime plan-meta-tests passed");
