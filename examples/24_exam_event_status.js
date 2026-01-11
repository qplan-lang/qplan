/**
 * QPlan Event Status Test
 * 
 * Example checking status in onPlanEnd event
 */

import { QPlan } from "../dist/index.js";

// ========================================
// 1. Normal Completion (completed)
// ========================================
async function testCompleted() {
    console.log("\n=== 1. Completed Status Test ===");

    const script = `
step id="step1" {
  print msg="Step 1"
}

step id="step2" {
  print msg="Step 2"
}
  `;

    const qplan = new QPlan(script);

    await qplan.run({
        stepEvents: {
            onPlanEnd(plan) {
                console.log("✓ Plan ended with status:", plan.status);
                console.log("  Error:", plan.error?.message || "none");
            }
        }
    });
}

// ========================================
// 2. Stop with keyword (stopped)
// ========================================
async function testStopped() {
    console.log("\n=== 2. Stopped Status Test ===");

    const script = `
step id="step1" {
  print msg="Step 1"
}

step id="step2" {
  print msg="Step 2 - will stop"
  stop
  print msg="This won't execute"
}

step id="step3" {
  print msg="Step 3 - won't execute"
}
  `;

    const qplan = new QPlan(script);

    try {
        await qplan.run({
            stepEvents: {
                onPlanEnd(plan) {
                    console.log("✓ Plan ended with status:", plan.status);
                    console.log("  Error:", plan.error?.message || "none");
                }
            }
        });
    } catch (err) {
        // stop throws an error, so it is caught
        console.log("  Caught:", err.message);
    }
}

// ========================================
// 3. Forced Stop with Abort (aborted)
// ========================================
async function testAborted() {
    console.log("\n=== 3. Aborted Status Test ===");

    const script = `
step id="step1" {
  print msg="Step 1"
}

step id="step2" {
  print msg="Step 2"
}

step id="step3" {
  print msg="Step 3"
}
  `;

    const qplan = new QPlan(script);

    // Call abort after 100ms
    setTimeout(() => {
        console.log("  Calling abort()...");
        qplan.abort();
    }, 100);

    try {
        await qplan.run({
            stepEvents: {
                onPlanEnd(plan) {
                    console.log("✓ Plan ended with status:", plan.status);
                    console.log("  Error:", plan.error?.message || "none");
                }
            }
        });
    } catch (err) {
        console.log("  Caught:", err.message);
    }
}

// ========================================
// 4. Error Occurrence (error)
// ========================================
async function testError() {
    console.log("\n=== 4. Error Status Test ===");

    const script = `
step id="step1" {
  print msg="Step 1"
}

step id="step2" {
  // Call non-existent module -> Error
  nonexistent_module foo="bar"
}

step id="step3" {
  print msg="Step 3 - won't execute"
}
  `;

    const qplan = new QPlan(script);

    try {
        await qplan.run({
            stepEvents: {
                onPlanEnd(plan) {
                    console.log("✓ Plan ended with status:", plan.status);
                    console.log("  Error:", plan.error?.message || "none");
                }
            }
        });
    } catch (err) {
        console.log("  Caught:", err.message);
    }
}

// ========================================
// 5. Compare All Statuses
// ========================================
async function testAllStatuses() {
    console.log("\n=== 5. All Status Comparison ===");

    const statuses = {
        completed: 0,
        stopped: 0,
        aborted: 0,
        error: 0
    };

    const onPlanEnd = (plan) => {
        if (plan.status) {
            statuses[plan.status]++;
        }
    };

    // Completed
    try {
        const qplan1 = new QPlan(`step id="s1" { print msg="ok" }`);
        await qplan1.run({ stepEvents: { onPlanEnd } });
    } catch (e) { }

    // Stopped
    try {
        const qplan2 = new QPlan(`step id="s1" { stop }`);
        await qplan2.run({ stepEvents: { onPlanEnd } });
    } catch (e) { }

    // Aborted
    try {
        const qplan3 = new QPlan(`step id="s1" { print msg="test" }`);
        setTimeout(() => qplan3.abort(), 10);
        await qplan3.run({ stepEvents: { onPlanEnd } });
    } catch (e) { }

    // Error
    try {
        const qplan4 = new QPlan(`step id="s1" { bad_module }`);
        await qplan4.run({ stepEvents: { onPlanEnd } });
    } catch (e) { }

    console.log("\nStatus counts:");
    console.log("  completed:", statuses.completed);
    console.log("  stopped:", statuses.stopped);
    console.log("  aborted:", statuses.aborted);
    console.log("  error:", statuses.error);
}

// ========================================
// Main
// ========================================
async function main() {
    console.log("QPlan Event Status Test\n");
    console.log("=".repeat(50));

    try {
        await testCompleted();
        await testStopped();
        await testAborted();
        await testError();
        await testAllStatuses();
    } catch (err) {
        console.error("Unexpected error:", err);
    }

    console.log("\n" + "=".repeat(50));
    console.log("All tests completed!");
}

main();
