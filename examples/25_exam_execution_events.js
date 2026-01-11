/**
 * QPlan Execution Control Events Test
 * 
 * 실행 제어 이벤트 (abort, pause, resume, timeout, stateChange) 테스트
 */

import { QPlan } from "../dist/index.js";

// ========================================
// 1. Pause & Resume Events Test
// ========================================
async function testPauseResumeEvents() {
    console.log("\n=== 1. Pause & Resume Events Test ===");

    const script = `
step id="step1" {
  print msg="Start"
  sleep ms=200
  print msg="End"
}
  `;

    const qplan = new QPlan(script);

    // 50ms 후 일시정지, 그 후 100ms 뒤 재개
    setTimeout(() => {
        console.log("  [Control] Calling pause()...");
        qplan.pause();

        setTimeout(() => {
            console.log("  [Control] Calling resume()...");
            qplan.resume();
        }, 100);
    }, 50);

    await qplan.run({
        stepEvents: {
            onPause(ctx) {
                console.log("✓ Event: onPause triggered");
            },
            onResume(ctx) {
                console.log("✓ Event: onResume triggered");
            },
            onStateChange(newState, oldState, ctx) {
                console.log(`✓ Event: onStateChange (${oldState} -> ${newState})`);
            }
        }
    });
}

// ========================================
// 2. Abort Event Test
// ========================================
async function testAbortEvent() {
    console.log("\n=== 2. Abort Event Test ===");

    const script = `
step id="step1" {
    print msg="Start"
    sleep ms=500
    print msg="Should fail"
}
  `;

    const qplan = new QPlan(script);

    // 100ms 후 중단
    setTimeout(() => {
        console.log("  [Control] Calling abort()...");
        qplan.abort();
    }, 100);

    try {
        await qplan.run({
            stepEvents: {
                onAbort(ctx) {
                    console.log("✓ Event: onAbort triggered");
                },
                onStateChange(newState, oldState, ctx) {
                    console.log(`✓ Event: onStateChange (${oldState} -> ${newState})`);
                }
            }
        });
    } catch (err) {
        console.log("  [Main] Caught expected error:", err.message);
    }
}

// ========================================
// 3. Timeout Event Test
// ========================================
async function testTimeoutEvent() {
    console.log("\n=== 3. Timeout Event Test ===");

    const script = `
  step id="step1" {
      print msg="Start long task"
      sleep ms=500
      print msg="Should fail"
  }
    `;

    const qplan = new QPlan(script);

    try {
        await qplan.run({
            timeout: 100,
            stepEvents: {
                onTimeout(ctx) {
                    console.log("✓ Event: onTimeout triggered");
                },
                onAbort(ctx) {
                    console.log("✓ Event: onAbort triggered (by timeout)");
                },
                onStateChange(newState, oldState, ctx) {
                    console.log(`✓ Event: onStateChange (${oldState} -> ${newState})`);
                }
            }
        });
    } catch (err) {
        console.log("  [Main] Caught expected error:", err.message);
    }
}

// ========================================
// Main
// ========================================
async function main() {
    console.log("QPlan Execution Control Events Test\n");
    console.log("=".repeat(50));

    try {
        await testPauseResumeEvents();
        await testAbortEvent();
        await testTimeoutEvent();
    } catch (err) {
        console.error("Unexpected error:", err);
    }

    console.log("\n" + "=".repeat(50));
    console.log("All tests completed!");
}

main();
