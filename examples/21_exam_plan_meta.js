/**
 * Example 21 – Plan metadata (plan { @title ... })
 * ----------------------------------------------------------------------------
 * Shows how plan metadata can be read from the QPlan object and plan events.
 */
import { QPlan, registry } from "../dist/index.js";

const scripts = [
  {
    label: "plan block + quoted meta",
    script: `
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
`,
  },
  {
    label: "top-level meta without plan block",
    script: `
@title Onboarding Plan
@summary Create accounts and schedule training
@version 0.1
@since 2025-01-01

step id="setup" desc="Prep accounts" {
  var "ok" -> status
  return status=status
}
`,
  },
  {
    label: "single quotes + params",
    script: `
plan {
  @title 'Mini Plan'
  @summary 'Quick test plan'
  @params keyword,item

  step id="setup" desc="Prep accounts" {
    var "ok" -> status
    return status=status
  }
}
`,
  },
  {
    label: "params used in step",
    script: `
@title Param Plan
@summary Params flow into ctx
@params keyword, item

step id="use_params" {
  print keyword
  print item.aaa
}
`,
    runOptions: {
      params: { keyword: "foo", item: { aaa: 1 } },
    },
  },
];

for (const { label, script, runOptions } of scripts) {
  const qplan = new QPlan(script, { registry });
  console.log(`Plan meta from QPlan (${label}):`, qplan.getPlanMeta());
  await qplan.run({
    registry,
    ...(runOptions ?? {}),
    stepEvents: {
      onPlanStart(plan) {
        console.log(`Plan start meta (${label}):`, plan.planMeta);
      },
    },
  });
}
