// src/core/modules/fetch.ts

import { ActionModule } from "../core/moduleRegistry.js";
import { ExecutionContext } from "../core/executionContext.js";

/**
 * FETCH 기본 모듈
 * 실제 데이터 연동 대신 "mock fetch" 형태로 반환
 */
export class FetchDefaultModule implements ActionModule {
  async execute(
    inputs: Record<string, any>,
    ctx: ExecutionContext
  ): Promise<any> {
    // inputs: { stock: "005930", days: 30, ... }

    return {
      fetched: true,
      params: inputs,
      timestamp: Date.now(),
    };
  }
}
