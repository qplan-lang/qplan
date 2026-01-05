import assert from "node:assert";
import { QPlan, registry } from "../../dist/index.js";

async function testQPlanLifecycle() {
  const script = `
step id="seed" desc="Seed numbers" {
  var [1,2,3] -> numbers
}

step id="calc" desc="Sum numbers" {
  math op="sum" arr=seed.numbers -> total
  return total=total
}
`;

  const qplan = new QPlan(script, { registry });
  const validation = qplan.validate();
  assert.ok(validation.ok, "QPlan validation should pass");

  const initialSteps = qplan.getStepList();
  assert.strictEqual(initialSteps.length, 2);
  assert.deepStrictEqual(initialSteps.map(s => s.status), ["pending", "pending"]);
  assert.deepStrictEqual(initialSteps.map(s => s.desc), ["Seed numbers", "Sum numbers"]);

  const startStatuses = [];
  const endStatuses = [];

  const ctx = await qplan.run({
    registry,
    stepEvents: {
      async onStepStart(info) {
        const step = qplan.getStepList().find(step => step.id === info.stepId);
        startStatuses.push(step?.status);
      },
      async onStepEnd(info) {
        const step = qplan.getStepList().find(step => step.id === info.stepId);
        endStatuses.push(step?.status);
      },
    },
  });

  assert.deepStrictEqual(startStatuses, ["running", "running"], "steps should transition to running on start event");
  assert.deepStrictEqual(endStatuses, ["completed", "completed"], "steps should complete after execution");

  const finalSteps = qplan.getStepList();
  assert.deepStrictEqual(finalSteps.map(s => s.status), ["completed", "completed"]);
  const calcStep = finalSteps.find(step => step.id === "calc");
  assert.strictEqual(calcStep?.result.total, 6, "calc step result should be stored");

  const snapshot = ctx.toJSON();
  assert.strictEqual(snapshot[ctx.runId ?? Object.keys(snapshot)[0]].calc.total, 6);
}

await testQPlanLifecycle();
console.log("runtime qplan-object-tests passed");
