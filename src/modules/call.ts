// src/core/modules/call.ts

import { ActionModule } from "../core/moduleRegistry.js";
import { ExecutionContext } from "../core/executionContext.js";

/**
 * CALL 기본 모듈
 * 단순한 echo 형태: 입력을 그대로 반환
 */
export class CallDefaultModule implements ActionModule {
  async execute(
    inputs: Record<string, any>,
    ctx: ExecutionContext
  ): Promise<any> {
    return {
      called: true,
      inputs,
    };
  }
}
