import assert from "node:assert";
import { runQplan } from "../../dist/index.js";
import { ModuleRegistry } from "../../dist/core/moduleRegistry.js";

const envEchoModule = {
  id: "env_echo",
  description: "Returns env/metadata to verify run-level context wiring",
  inputs: [],
  async execute(_inputs, ctx) {
    return {
      envUser: ctx.getEnv()?.userId ?? null,
      metaRequest: ctx.getMetadata()?.requestId ?? null,
    };
  },
};

async function testEnvHooksAndPlanEvents() {
  const customRegistry = new ModuleRegistry();
  customRegistry.register(envEchoModule);

  const script = `
step id="capture" desc="Capture env info" {
  env_echo -> envResult
}

step id="done" desc="Finish" {
  echo msg="done" -> doneMessage
}
`;

  const planEvents = [];
  const stepStartInfos = [];
  const stepEndResults = [];
  const contexts = new Set();
  const env = { userId: "user-123" };
  const metadata = { requestId: "req-456" };
  const runId = "test-run-1";

  const ctx = await runQplan(script, {
    registry: customRegistry,
    env,
    metadata,
    runId,
    stepEvents: {
      async onPlanStart(plan, context) {
        planEvents.push({ type: "start", plan, env: context?.env });
        contexts.add(context);
      },
      async onPlanEnd(plan, context) {
        planEvents.push({ type: "end", plan, env: context?.env });
        contexts.add(context);
      },
      async onStepStart(info, context) {
        stepStartInfos.push({ info, env: context?.env });
        contexts.add(context);
      },
      async onStepEnd(info, result, context) {
        stepEndResults.push({ info, result, metadata: context?.metadata });
        contexts.add(context);
      },
      async onStepError() {
        throw new Error("onStepError should not fire in this test");
      },
    },
  });

  assert.strictEqual(planEvents.length, 2, "plan start/end should fire");
  assert.strictEqual(planEvents[0].plan.runId, runId);
  assert.deepStrictEqual(planEvents[0].env, env);
  assert.strictEqual(planEvents[0].plan.totalSteps, 2);
  assert.strictEqual(planEvents[1].plan.runId, runId);

  assert.strictEqual(stepStartInfos.length, 2, "both steps should emit start events");
  for (const { info, env: recordedEnv } of stepStartInfos) {
    assert.strictEqual(info.runId, runId);
    assert.strictEqual(info.depth, 0);
    assert.strictEqual(info.errorPolicy.type, "fail");
    assert.deepStrictEqual(recordedEnv, env);
  }

  assert.strictEqual(stepEndResults.length, 2);
  assert.deepStrictEqual(stepEndResults[0].result, {
    envUser: env.userId,
    metaRequest: metadata.requestId,
  });
  assert.deepStrictEqual(stepEndResults[0].metadata, metadata);

  const snapshot = ctx.toJSON();
  assert.deepStrictEqual(snapshot.envResult, {
    envUser: env.userId,
    metaRequest: metadata.requestId,
  });

  // Ensure all callbacks shared the same context object.
  assert.strictEqual(contexts.size, 1, "all events should share one run context");
}

await testEnvHooksAndPlanEvents();
console.log("runtime runQplan-tests passed");
