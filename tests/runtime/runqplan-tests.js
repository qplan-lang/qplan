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

const captureInputsModule = {
  id: "capture_inputs",
  description: "Echoes received inputs for verifying ctx argument resolution",
  inputs: [],
  async execute(inputs) {
    return { ...inputs };
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
  assert.deepStrictEqual(stepEndResults[0].result.envResult, {
    envUser: env.userId,
    metaRequest: metadata.requestId,
  });
  assert.deepStrictEqual(stepEndResults[0].metadata, metadata);

  const snapshot = ctx.toJSON();
  assert.deepStrictEqual(snapshot.envResult, {
    envUser: env.userId,
    metaRequest: metadata.requestId,
  });
  assert.deepStrictEqual(ctx.get("capture").envResult, {
    envUser: env.userId,
    metaRequest: metadata.requestId,
  });
  assert.deepStrictEqual(snapshot[runId].capture, {
    envResult: {
      envUser: env.userId,
      metaRequest: metadata.requestId,
    },
  });

  // Ensure all callbacks shared the same context object.
  assert.strictEqual(contexts.size, 1, "all events should share one run context");
}

async function testReturnShorthandAndStepNamespace() {
  const script = `
step id="collect" desc="Return shorthand" {
  var 1 -> gear
  var 2 -> accounts
  var 5 -> sum
  return gear accounts total=sum
}

step id="analysis" desc="Auto namespace" {
  var "report-ready" -> report
  var {"score": 91} -> timing
}

step id="custom" desc="Alias namespace" -> 결과네임스페이스 {
  var "alias-value" -> 값
  return 최종=값
}
`;

  const runId = "test-run-namespace";
  const ctx = await runQplan(script, { runId });

  assert.strictEqual(ctx.get("collect.total"), 5);
  assert.strictEqual(ctx.get("collect.gear"), 1);
  assert.strictEqual(ctx.get("collect.accounts"), 2);
  assert.strictEqual(ctx.get("analysis.report"), "report-ready");
  assert.deepStrictEqual(ctx.get("analysis.timing"), { score: 91 });
  assert.deepStrictEqual(ctx.get("analysis"), {
    report: "report-ready",
    timing: { score: 91 },
  });
  assert.strictEqual(ctx.get("결과네임스페이스.최종"), "alias-value");
  assert.strictEqual(ctx.get("custom.최종"), "alias-value");
  assert.deepStrictEqual(ctx.get("custom"), { 최종: "alias-value" });
  assert.deepStrictEqual(ctx.get("결과네임스페이스"), { 최종: "alias-value" });

  const snapshot = ctx.toJSON();
  assert.ok(snapshot[runId]);
  assert.deepStrictEqual(snapshot[runId].collect.gear, 1);
  assert.deepStrictEqual(snapshot[runId].analysis.timing, { score: 91 });
  assert.deepStrictEqual(snapshot[runId].custom, { 최종: "alias-value" });
  assert.deepStrictEqual(snapshot[runId].결과네임스페이스, { 최종: "alias-value" });
}

async function testActionArgsResolveAgainstCtx() {
  const registry = new ModuleRegistry();
  registry.register(captureInputsModule);

  const script = `
step id="fetch_basic" desc="기본 데이터" {
  var {"code":"005930","name":"Samsung Electronics"} -> basicInfo
}

step id="fetch_news" desc="뉴스" {
  var [
    {"title":"삼성전자 실적", "sentiment":"positive"},
    {"title":"삼성전자 공급망", "sentiment":"neutral"}
  ] -> newsList
}

step id="summarize" desc="요약 리포트 작성" {
  capture_inputs basicInfo=basicInfo news=newsList
                 viaStep=fetch_basic viaStepField=fetch_basic.basicInfo -> summary
}
`;

  const ctx = await runQplan(script, { registry });
  const summary = ctx.get("summary");

  assert.strictEqual(summary.basicInfo.code, "005930");
  assert.strictEqual(summary.basicInfo.name, "Samsung Electronics");
  assert.strictEqual(summary.news.length, 2);
  assert.strictEqual(summary.viaStep.basicInfo.name, "Samsung Electronics");
  assert.deepStrictEqual(summary.viaStepField, {
    code: "005930",
    name: "Samsung Electronics",
  });
}

async function testCommentsIgnoredDuringExecution() {
  const script = `
// header comment
step id="setup" {
  # hash comment
  var 1 -> one
  /* block
     comment */
  var 2 -> two
}

step id="sum" {
  math add a=setup.one b=setup.two -> total
  // comment after computation
  return total=total
}
`;

  const ctx = await runQplan(script);
  const total = ctx.get("sum.total");
  assert.strictEqual(total, 3);
}

await testEnvHooksAndPlanEvents();
await testReturnShorthandAndStepNamespace();
await testActionArgsResolveAgainstCtx();
await testCommentsIgnoredDuringExecution();
console.log("runtime runQplan-tests passed");
