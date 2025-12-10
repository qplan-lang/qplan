// src/modules/future.ts
import { ExecutionContext } from "../core/executionContext.js";
import { ActionModule } from "../core/moduleRegistry.js";

export class FutureModule implements ActionModule {
  async execute(inputs: Record<string, any>, ctx: ExecutionContext) {
    const { task } = inputs;

    // 실제 비동기 작업을 Promise로 생성
    const promise = (async () => {
      await new Promise(r => setTimeout(r, 500)); // 예: 0.5초 지연
      return `완료: ${task}`;
    })();

    return promise; // ctx.set(f1, Promise)
  }
}
