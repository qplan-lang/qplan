/**
 * Example 19 – QPlan object lifecycle demo
 * ----------------------------------------------------------------------------
 * This example shows how to wrap a QPlan script inside the QPlan class, validate
 * it before execution, inspect the static step list for UI rendering, and track
 * runtime status updates (pending/running/retrying/completed/error) solely via
 * getStepList() while still forwarding custom stepEvents for logging.
 */
import { QPlan, registry } from "../dist/index.js";

const script = `
step id="load" desc="Load sample numbers" {
  file read path="./examples/nums.txt" -> raw
  return text=raw
}

step id="stats" desc="Calculate stats" {
  math op="sum" arr=load.text -> total
  math op="avg" arr=load.text -> average
  return total=total average=average
}

step id="report" desc="Print summary" {
  echo msg="Numbers:\n\${load.text}" -> listMsg
  echo msg="Total: \${stats.total}, Avg: \${stats.average}" -> statsMsg
}
`;

const qplan = new QPlan(script, { registry });

const validation = qplan.validate();
if (!validation.ok) {
  console.error("Script validation failed:", validation);
  process.exit(1);
}

const printSteps = (label) => {
  console.log(`\n=== ${label} ===`);
  console.table(
    qplan.getStepList().map(step => ({
      id: step.id,
      desc: step.desc,
      status: step.status,
      result: step.result,
    }))
  );
};

printSteps("Initial states");

const ctx = await qplan.run({
  registry,
  stepEvents: {
    async onStepStart(info) {
      console.log(`→ STEP START: ${info.stepId} (${info.desc ?? "no desc"})`);
    },
    async onStepEnd(info) {
      console.log(`✓ STEP END: ${info.stepId}`);
    },
  },
});

printSteps("Final states");

console.log("\nExecution context:");
console.dir(ctx.toJSON(), { depth: null });
