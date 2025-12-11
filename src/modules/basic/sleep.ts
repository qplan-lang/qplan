import { ActionModule } from "../../core/actionModule.js";

/**
 * sleep 모듈
 * -----------------------------------------
 * 지정된 시간(ms) 동안 대기하는 모듈.
 *
 * DSL 예:
 *   sleep ms=500 -> out
 */
export const sleepModule: ActionModule = Object.assign(
  async (inputs: Record<string, any>) => {
    const ms = Number(inputs.ms ?? 0);
    await new Promise((r) =>
      setTimeout(() => {
        console.log(`[sleep] finished waiting ${ms}ms`);
        r(null);
      }, ms)
    );
    return `slept ${ms}ms`;
  },
  {
    id: "sleep",
    description: "지정된 시간(ms) 동안 대기하는 모듈.",
    usage: `sleep ms=500 -> out`,
    inputs: ["ms"]
  }
);
