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

async function testBracketIndexAccess() {
  const registry = new ModuleRegistry();
  registry.register(captureInputsModule);

  const script = `
step id="seed" {
  var [10, 20, 30] -> arr
}

step id="use" {
  capture_inputs first=arr[0] second=arr[1] -> result
}
`;

  const ctx = await runQplan(script, { registry });
  assert.deepStrictEqual(ctx.get("result"), { first: 10, second: 20 });
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

async function testParamsSeedVariables() {
  const script = `
step id="seeded" {
  print keyword
  print item.aaa
}
`;

  const ctx = await runQplan(script, {
    params: { keyword: "foo", item: { aaa: 1 } },
  });

  assert.strictEqual(ctx.get("keyword"), "foo");
  assert.deepStrictEqual(ctx.get("item"), { aaa: 1 });
  assert.strictEqual(ctx.get("item.aaa"), 1);
  assert.strictEqual(ctx.get("seeded"), 1);
}

async function testMissingParamsThrows() {
  const script = `
@params keyword, item
step id="seeded" {
  print keyword
}
`;
  let threw = false;
  try {
    await runQplan(script, { params: { keyword: "foo" } });
  } catch (err) {
    threw = true;
    assert.ok(String(err).includes("Missing params"), "Error should mention missing params");
  }
  assert.strictEqual(threw, true, "Missing params should throw");
}

async function testStopReturnsContextAndEmitsPlanEnd() {
  const script = `
step id="start" {
  print "before stop"
  stop
  print "after stop"
}
`;

  const planEvents = [];
  const ctx = await runQplan(script, {
    stepEvents: {
      async onPlanStart(plan) {
        planEvents.push({ type: "start", plan });
      },
      async onPlanEnd(plan) {
        planEvents.push({ type: "end", plan });
      },
    },
  });

  assert.ok(ctx, "Context should be returned when stop occurs");
  assert.strictEqual(planEvents.length, 2, "plan start/end should fire");
  assert.strictEqual(planEvents[0].type, "start");
  assert.strictEqual(planEvents[1].type, "end");
  assert.strictEqual(planEvents[1].plan.status, "stopped");
}

async function testStopSkipsFollowingSteps() {
  const script = `
step id="first" {
  var "started" -> marker
  stop
}

step id="second" {
  var "should-not-run" -> marker2
}
`;
  const ctx = await runQplan(script);
  assert.strictEqual(ctx.get("marker"), "started");
  assert.strictEqual(ctx.get("marker2"), undefined);
}

async function testStopInsideEachLoop() {
  const script = `
step id="loop" {
  var 0 -> sum
  json parse data="[1,2,3,4]" -> nums
  each value in nums {
    if value == 3 {
      stop
    }
    math add a=sum b=value -> sum
  }
}
`;
  const ctx = await runQplan(script);
  assert.strictEqual(ctx.get("sum"), 3);
}

async function testStopInsideWhileLoop() {
  const script = `
step id="loop" {
  var 0 -> sum
  var 0 -> i
  while i < 10 {
    math add a=i b=1 -> i
    if i == 4 {
      stop
    }
    math add a=sum b=i -> sum
  }
}
`;
  const ctx = await runQplan(script);
  assert.strictEqual(ctx.get("sum"), 1 + 2 + 3);
}

async function testStopInNestedBlock() {
  const script = `
step id="nested" {
  var 1 -> value
  if value == 1 {
    stop
  }
  var 2 -> value2
}
`;
  const ctx = await runQplan(script);
  assert.strictEqual(ctx.get("value"), 1);
  assert.strictEqual(ctx.get("value2"), undefined);
}

async function testStopUsesStepEndEvent() {
  const script = `
step id="err_guard" {
  stop
}
`;
  let stepErrorFired = false;
  let stepEndFired = false;
  await runQplan(script, {
    stepEvents: {
      async onStepError() {
        stepErrorFired = true;
      },
      async onStepEnd() {
        stepEndFired = true;
      },
    },
  });
  assert.strictEqual(stepErrorFired, false);
  assert.strictEqual(stepEndFired, true);
}

async function testStopStepStatusInEvents() {
  const script = `
step id="one" {
  stop
}
`;
  const planEvents = [];
  await runQplan(script, {
    stepEvents: {
      async onPlanEnd(plan) {
        planEvents.push(plan);
      },
    },
  });
  assert.strictEqual(planEvents.length, 1);
  assert.strictEqual(planEvents[0].status, "stopped");
}

async function testStopInsideParallel() {
  const script = `
step id="parent" {
  parallel {
    step id="p1" {
      print "p1"
    }
    step id="p2" {
      stop
    }
  }
  var "after" -> afterParallel
}
`;
  const ctx = await runQplan(script);
  assert.strictEqual(ctx.get("afterParallel"), undefined);
}

async function testStopInsideStepWithReturnIsNotExecuted() {
  const script = `
step id="returns" {
  stop
  return result="after-stop"
}
`;
  const ctx = await runQplan(script);
  assert.strictEqual(ctx.get("returns.result"), undefined);
}

async function testSkipContinuesToNextStep() {
  const script = `
step id="first" {
  var "started" -> marker
  skip
  var "after-skip" -> marker2
}

step id="second" {
  var "next-step" -> marker3
}
`;
  const ctx = await runQplan(script);
  assert.strictEqual(ctx.get("marker"), "started");
  assert.strictEqual(ctx.get("marker2"), undefined);
  assert.strictEqual(ctx.get("marker3"), "next-step");
}

async function testUnaryTruthyConditions() {
  const script = `
step id="seed" {
  var [] -> emptyArr
  var [1,2] -> arr
  var {} -> emptyObj
  var 0 -> zero
  var null -> nil
  var "" -> emptyStr
  var "hi" -> text
}

step id="check" {
  if emptyArr {
    var "empty-array-true" -> r1
  }
  if arr {
    var "array-true" -> r2
  }
  if emptyObj {
    var "object-true" -> r3
  }
  if zero {
    var "zero-true" -> r4
  } else {
    var "zero-false" -> r4
  }
  if nil {
    var "null-true" -> r4_1
  } else {
    var "null-false" -> r4_1
  }
  if emptyStr {
    var "emptyStr-true" -> r5
  } else {
    var "emptyStr-false" -> r5
  }
  if text {
    var "text-true" -> r6
  }
  if missingVar {
    var "missing-true" -> r7
  } else {
    var "missing-false" -> r7
  }
  if undefined {
    var "undefined-true" -> r8
  } else {
    var "undefined-false" -> r8
  }
}
`;

  const ctx = await runQplan(script);
  assert.strictEqual(ctx.get("r1"), "empty-array-true");
  assert.strictEqual(ctx.get("r2"), "array-true");
  assert.strictEqual(ctx.get("r3"), "object-true");
  assert.strictEqual(ctx.get("r4"), "zero-false");
  assert.strictEqual(ctx.get("r4_1"), "null-false");
  assert.strictEqual(ctx.get("r5"), "emptyStr-false");
  assert.strictEqual(ctx.get("r6"), "text-true");
  assert.strictEqual(ctx.get("r7"), "missing-false");
  assert.strictEqual(ctx.get("r8"), "undefined-false");
}

await testEnvHooksAndPlanEvents();
await testReturnShorthandAndStepNamespace();
await testActionArgsResolveAgainstCtx();
await testBracketIndexAccess();
await testCommentsIgnoredDuringExecution();
await testParamsSeedVariables();
await testMissingParamsThrows();
await testStopReturnsContextAndEmitsPlanEnd();
await testStopSkipsFollowingSteps();
await testStopInsideEachLoop();
await testStopInsideWhileLoop();
await testStopInNestedBlock();
await testStopUsesStepEndEvent();
await testStopStepStatusInEvents();
await testStopInsideParallel();
await testStopInsideStepWithReturnIsNotExecuted();
await testSkipContinuesToNextStep();
await testUnaryTruthyConditions();
console.log("runtime runQplan-tests passed");
