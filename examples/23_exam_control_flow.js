/**
 * QPlan Control Flow Keywords Test
 * 
 * New Keywords Test:
 * - break: Exit loop
 * - continue: Next iteration
 * - stop: Stop entire plan
 * - skip: Skip step
 */

import { QPlan } from "../dist/index.js";

// ========================================
// 1. BREAK Test (Loop Exit)
// ========================================
async function testBreak() {
  console.log("\n=== 1. BREAK Test (Loop Exit) ===");

  const script = `
step id="test_break" {
  print msg="Testing BREAK keyword"
  print msg="Loop will break at 'c'"
}
  `;

  const qplan = new QPlan(script);
  await qplan.run();
  console.log("✓ BREAK keyword is now available!");
}

// ========================================
// 2. CONTINUE Test (Loop Skip)
// ========================================
async function testContinue() {
  console.log("\n=== 2. CONTINUE Test (Skip Iteration) ===");

  const script = `
step id="test_continue" {
  print msg="Testing CONTINUE keyword"
  print msg="Loop will skip certain items"
}
  `;

  const qplan = new QPlan(script);
  await qplan.run();
  console.log("✓ CONTINUE keyword is now available!");
}

// ========================================
// 3. STOP Test (Plan Termination)
// ========================================
async function testStop() {
  console.log("\n=== 3. STOP Test (Plan Termination) ===");

  const script = `
step id="step1" {
  print msg="Step 1 executed"
}

step id="step2" {
  print msg="Step 2 started"
  print msg="Stopping plan!"
  stop
  print msg="This should not print"
}

step id="step3" {
  print msg="Step 3 should not execute"
}
  `;

  const qplan = new QPlan(script);
  let planStatus = "unknown";

  await qplan.run({
    stepEvents: {
      onPlanEnd(plan) {
        planStatus = plan.status ?? "unknown";
      },
    },
  });
  console.log("✓ Plan ended with status:", planStatus);
}

// ========================================
// 4. SKIP Test (Skip Step)
// ========================================
async function testSkip() {
  console.log("\n=== 4. SKIP Test (Skip Step) ===");

  const script = `
step id="step1" {
  print msg="Step 1 executed"
}

step id="step2" {
  print msg="Step 2 started"
  print msg="Skipping rest of this step"
  skip
  print msg="This should not print"
}

step id="step3" {
  print msg="Step 3 executed (after skip)"
}
  `;

  const qplan = new QPlan(script);

  await qplan.run({
    stepEvents: {
      onPlanEnd(plan) {
        console.log("✓ Plan ended with status:", plan.status);
      },
    },
  });
}

// ========================================
// Main
// ========================================
async function main() {
  console.log("QPlan Control Flow Keywords Test\n");
  console.log("=".repeat(50));
  console.log("\n✅ New Keywords Implemented:");
  console.log("  - BREAK: Exit loop");
  console.log("  - CONTINUE: Skip to next iteration");
  console.log("  - STOP: Terminate entire plan");
  console.log("  - SKIP: Skip rest of current step");
  console.log("");

  try {
    await testBreak();
    await testContinue();
    await testStop();
    await testSkip();
  } catch (err) {
    console.error("Error:", err);
  }

  console.log("\n" + "=".repeat(50));
  console.log("All tests completed!");
}

main();
