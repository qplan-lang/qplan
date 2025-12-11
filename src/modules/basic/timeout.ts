import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";

/**
 * timeout 모듈
 * -----------------------------------------
 * 지정한 ms 만큼 대기 후 value 또는 null 반환.
 *
 * DSL 예:
 *   timeout ms=500 value="done" -> out
 */
export const timeoutModule: ActionModule = {
  id: "timeout",
  description: "주어진 시간(ms) 동안 대기 후 value를 반환.",
  usage: `timeout ms=500 value="ok" -> out`,
  inputs: ["ms", "value"],

  async execute(inputs: Record<string, any>, _ctx: ExecutionContext) {
    const ms = Number(inputs.ms ?? 0);
    const value = inputs.value ?? null;

    if (!ms || ms <= 0) {
      throw new Error("timeout module requires 'ms' > 0");
    }

    await new Promise((resolve) => setTimeout(resolve, ms));
    return value;
  }
};
