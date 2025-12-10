// src/core/modules/ai.ts

import { ActionModule } from "../core/moduleRegistry.js";
import { ExecutionContext } from "../core/executionContext.js";

/**
 * AI 기본 모듈
 * 실제 AI 대신 mock response
 */
export class AiDefaultModule implements ActionModule {
  async execute(
    inputs: Record<string, any>,
    ctx: ExecutionContext
  ): Promise<any> {
    const { prompt, using } = inputs;

    return {
      ai: true,
      prompt,
      using,
      output: `AI mock response for: ${prompt}`,
    };
  }
}
