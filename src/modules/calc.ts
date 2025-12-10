// src/core/modules/calc.ts

import { ActionModule } from "../core/moduleRegistry.js";
import { ExecutionContext } from "../core/executionContext.js";

/**
 * CALC 기본 모듈
 * 단순 파생값: input 값을 그대로 wrapping해서 리턴
 */
export class CalcDefaultModule implements ActionModule {
  async execute(
    inputs: Record<string, any>,
    ctx: ExecutionContext
  ): Promise<any> {
    // inputs: { calcName, input: value }
    const { calcName, input } = inputs;

    return {
      calc: calcName,
      result: input,
    };
  }
}
