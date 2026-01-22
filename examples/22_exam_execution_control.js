/**
 * QPlan Execution Control Example
 * 
 * Execution control feature demo:
 * - Abort
 * - Pause/Resume
 * - Timeout
 * - Checkpoint
 */

import { QPlan, ExecutionState, runQplan } from "../dist/index.js";

// ========================================
// 1. Abort Example
// ========================================
async function exampleAbort() {
  console.log("\n=== 1. Abort Example ===");

  const script = `
step id="step1" {
  print msg="Step 1 started"
  sleep ms=2000
  print msg="Step 1 completed"
}

step id="step2" {
  print msg="Step 2 started"
  sleep ms=2000
  print msg="Step 2 completed"
}

step id="step3" {
  print msg="Step 3 started"
  sleep ms=2000
  print msg="Step 3 completed"
}
  `;

  const qplan = new QPlan(script);
  let planStatus = "unknown";

  // Abort after 1s
  setTimeout(() => {
    console.log("⏹️  Aborting execution...");
    qplan.abort();
  }, 1000);

  await qplan.run({
    stepEvents: {
      onPlanEnd(plan) {
        planStatus = plan.status ?? "unknown";
      },
    },
  });
  console.log("Plan status:", planStatus);
  console.log("Final state:", qplan.getState());
}

// ========================================
// 2. Pause/Resume Example
// ========================================
async function examplePauseResume() {
  console.log("\n=== 2. Pause/Resume Example ===");

  const script = `
step id="step1" {
  print msg="Step 1 executing"
  sleep ms=500
}

step id="step2" {
  print msg="Step 2 executing"
  sleep ms=500
}

step id="step3" {
  print msg="Step 3 executing"
  sleep ms=500
}

step id="step4" {
  print msg="Step 4 executing"
  sleep ms=500
}
  `;

  const qplan = new QPlan(script);

  // Pause after 500ms
  setTimeout(() => {
    console.log("⏸️  Pausing...");
    qplan.pause();
    console.log("State:", qplan.getState());

    // Resume after 2s
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
// 3. Timeout Example
// ========================================
async function exampleTimeout() {
  console.log("\n=== 3. Timeout Example ===");

  const script = `
step id="long_running" {
  print msg="Start long-running task"
  sleep ms=5000
  print msg="Completed (This message will not be shown)"
}
  `;

  const qplan = new QPlan(script);

  let planStatus = "unknown";
  await qplan.run({
    timeout: 2000, // 2 seconds timeout
    stepEvents: {
      onPlanEnd(plan) {
        planStatus = plan.status ?? "unknown";
      },
    },
  });
  console.log("Plan status:", planStatus);
  console.log("State:", qplan.getState());
  console.log("Elapsed:", qplan.getElapsedTime(), "ms");
}

// ========================================
// 4. Checkpoint Example
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
    autoCheckpoint: true,  // Auto-checkpoint before each Step
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
// 5. Execution State Monitoring Example
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

  // State monitoring
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
// 6. Stop Example
// ========================================
async function exampleStop() {
  console.log("\n=== 6. Stop Example ===");

  const script = `
step id="step1" {
  print msg="Step 1 started"
  stop
  print msg="Step 1 after stop (not executed)"
}

step id="step2" {
  print msg="Step 2 (not executed)"
}
  `;

  const planEvents = [];
  const ctx = await runQplan(script, {
    stepEvents: {
      async onPlanEnd(plan) {
        planEvents.push(plan);
      },
    },
  });

  console.log("Plan status:", planEvents[0]?.status);
  console.log("Context keys:", Object.keys(ctx.toJSON()));
  console.log("✅ Program continues after stop");
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
    await exampleStop();
  } catch (err) {
    console.error("Error:", err);
  }

  console.log("\n" + "=".repeat(50));
  console.log("All examples completed!");
}

main();
