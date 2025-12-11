import { ActionModule } from "../../core/actionModule.js";

/**
 * future 모듈
 * -----------------------------------------
 * 비동기 작업을 future로 래핑하는 모듈.
 * delay(ms) 후 value를 resolve하는 Promise를 생성하고, __future로 감싼다.
 *
 * DSL 예:
 *   future task="A" delay=500 -> f1
 */
export const futureModule: ActionModule = {
  id: "future",
  description: "비동기 future를 생성하는 모듈. 딜레이(ms) 후 value 반환.",
  usage: `future task="A" delay=500 -> f1`,
  inputs: ["task", "delay", "value"],

  execute(inputs: Record<string, any>) {
    const delay = Number(inputs.delay ?? 500);
    const task = inputs.task ?? "unknown";
    const value = inputs.value ?? `done:${task}`;

    const p = new Promise((res) =>
      setTimeout(() => {
        console.log(`[future] task '${task}' resolved after ${delay}ms`);
        res(value);
      }, delay)
    );

    return { __future: p };
  }
};
