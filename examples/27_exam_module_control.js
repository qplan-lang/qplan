/**
 * Module-aware execution control example
 * - Module checks ctx.checkControl() and reads ctx.getExecutionState()
 */

import { QPlan, AbortError } from "../dist/index.js";
import { ModuleRegistry } from "../dist/core/moduleRegistry.js";

const spinModule = Object.assign(
  async (inputs, ctx) => {
    const total = Number(inputs.total ?? 20);
    const delayMs = Number(inputs.delay ?? 100);

    for (let i = 1; i <= total; i++) {
      await ctx.checkControl();
      const state = ctx.getExecutionState() ?? "unknown";
      console.log(`[spin] tick ${i}/${total} (state=${state})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }

    return { ticks: total };
  },
  {
    id: "spin",
    description: "Loop with execution control checks",
    usage: "spin total=20 delay=100 -> result",
    inputs: ["total", "delay"],
  }
);

async function main() {
  const script = `
step id="spin_step" {
  print msg="starting spin"
  spin total=30 delay=100 -> spinResult
  print msg="spin completed"
}
  `;

  const registry = new ModuleRegistry({
    seedBasicModules: true,
    seedModules: [spinModule],
  });

  const qplan = new QPlan(script, { registry });

  setTimeout(() => {
    console.log("⏸️  Pausing...");
    qplan.pause();
  }, 500);

  setTimeout(() => {
    console.log("▶️  Resuming...");
    qplan.resume();
  }, 1500);

  setTimeout(() => {
    console.log("⏹️  Aborting...");
    qplan.abort();
  }, 2500);

  try {
    await qplan.run();
    console.log("✅ Completed");
  } catch (err) {
    if (err instanceof AbortError) {
      console.log("❌ Aborted in module loop");
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exitCode = 1;
});
