/**
 * QPlan Execution Control Example
 * 
 * 실행 제어 기능 데모:
 * - Abort (중지)
 * - Pause/Resume (일시중지/재개)
 * - Timeout (타임아웃)
 * - Checkpoint (체크포인트)
 */

import { QPlan, ExecutionState, AbortError } from "../dist/index.js";

// ========================================
// 1. Abort (중지) 예제
// ========================================
async function exampleAbort() {
    console.log("\n=== 1. Abort Example ===");

    const script = `
step id="step1" {
  print msg="Step 1 시작"
  sleep ms=2000
  print msg="Step 1 완료"
}

step id="step2" {
  print msg="Step 2 시작"
  sleep ms=2000
  print msg="Step 2 완료"
}

step id="step3" {
  print msg="Step 3 시작"
  sleep ms=2000
  print msg="Step 3 완료"
}
  `;

    const qplan = new QPlan(script);

    // 1초 후 중지
    setTimeout(() => {
        console.log("⏹️  Aborting execution...");
        qplan.abort();
    }, 1000);

    try {
        await qplan.run();
        console.log("✅ Completed");
    } catch (err) {
        if (err instanceof AbortError) {
            console.log("❌ Execution aborted:", err.message);
            console.log("Final state:", qplan.getState());
        } else {
            throw err;
        }
    }
}

// ========================================
// 2. Pause/Resume (일시중지/재개) 예제
// ========================================
async function examplePauseResume() {
    console.log("\n=== 2. Pause/Resume Example ===");

    const script = `
step id="step1" {
  print msg="Step 1 실행"
  sleep ms=500
}

step id="step2" {
  print msg="Step 2 실행"
  sleep ms=500
}

step id="step3" {
  print msg="Step 3 실행"
  sleep ms=500
}

step id="step4" {
  print msg="Step 4 실행"
  sleep ms=500
}
  `;

    const qplan = new QPlan(script);

    // 500ms 후 일시중지
    setTimeout(() => {
        console.log("⏸️  Pausing...");
        qplan.pause();
        console.log("State:", qplan.getState());

        // 2초 후 재개
        setTimeout(() => {
            console.log("▶️  Resuming...");
            qplan.resume();
            console.log("State:", qplan.getState());
        }, 2000);
    }, 500);

    try {
        const startTime = Date.now();
        await qplan.run();
        const elapsed = Date.now() - startTime;
        console.log(`✅ Completed in ${elapsed}ms`);
        console.log("Final state:", qplan.getState());
    } catch (err) {
        console.error("❌ Error:", err);
    }
}

// ========================================
// 3. Timeout (타임아웃) 예제
// ========================================
async function exampleTimeout() {
    console.log("\n=== 3. Timeout Example ===");

    const script = `
step id="long_running" {
  print msg="장시간 실행 작업 시작"
  sleep ms=5000
  print msg="완료 (이 메시지는 표시되지 않음)"
}
  `;

    const qplan = new QPlan(script);

    try {
        await qplan.run({
            timeout: 2000  // 2초 타임아웃
        });
        console.log("✅ Completed");
    } catch (err) {
        if (err instanceof AbortError) {
            console.log("❌ Execution timed out");
            console.log("State:", qplan.getState());
            console.log("Elapsed:", qplan.getElapsedTime(), "ms");
        } else {
            throw err;
        }
    }
}

// ========================================
// 4. Checkpoint (체크포인트) 예제
// ========================================
async function exampleCheckpoint() {
    console.log("\n=== 4. Checkpoint Example ===");

    const script = `
step id="step1" {
  print msg="Step 1 executed"
}

step id="step2" {
  print msg="Step 2 executed"
}

step id="step3" {
  print msg="Step 3 executed"
}
  `;

    const qplan = new QPlan(script);

    await qplan.run({
        autoCheckpoint: true,  // 각 Step 전에 자동 체크포인트
        stepEvents: {
            onStepEnd(info, result) {
                console.log(`✓ Step '${info.stepId}' completed`);
            }
        }
    });

    console.log("\n📸 Checkpoints created:");
    const checkpoints = qplan.getCheckpoints();
    checkpoints.forEach((cp, index) => {
        console.log(`  ${index + 1}. ${cp.snapshotId}`);
        console.log(`     Step: ${cp.currentStepId}`);
        console.log(`     State: ${cp.state}`);
    });

    console.log(`\n✅ Total checkpoints: ${checkpoints.length}`);
}

// ========================================
// 5. 실행 상태 모니터링 예제
// ========================================
async function exampleStateMonitoring() {
    console.log("\n=== 5. State Monitoring Example ===");

    const script = `
step id="step1" {
  print msg="Step 1"
  sleep ms=1000
}

step id="step2" {
  print msg="Step 2"
  sleep ms=1000
}

step id="step3" {
  print msg="Step 3"
  sleep ms=1000
}
  `;

    const qplan = new QPlan(script);

    // 상태 모니터링
    const monitor = setInterval(() => {
        const status = qplan.getStatus();
        if (status) {
            console.log(`[${status.elapsedTime}ms] State: ${status.state}, Step: ${status.currentStepId}`);
        }
    }, 500);

    try {
        await qplan.run();
        console.log("\n✅ Final Status:", qplan.getStatus());
    } finally {
        clearInterval(monitor);
    }
}

// ========================================
// Main
// ========================================
async function main() {
    console.log("QPlan Execution Control Examples\n");
    console.log("=".repeat(50));

    try {
        await exampleAbort();
        await examplePauseResume();
        await exampleTimeout();
        await exampleCheckpoint();
        await exampleStateMonitoring();
    } catch (err) {
        console.error("Error:", err);
    }

    console.log("\n" + "=".repeat(50));
    console.log("All examples completed!");
}

main();
