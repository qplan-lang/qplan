// src/index.ts

import { tokenize } from "./core/tokenizer.js";
import { Parser } from "./core/parser.js";
import { Executor } from "./core/executor.js";
import { ExecutionContext } from "./core/executionContext.js";
import { ModuleRegistry } from "./core/moduleRegistry.js";

import { FetchDefaultModule } from "./modules/fetch.js";
import { CalcDefaultModule } from "./modules/calc.js";
import { CallDefaultModule } from "./modules/call.js";
import { AiDefaultModule } from "./modules/ai.js";
import { AiOpenAIModule } from "./modules/aiOpenAI.js";
import { FetchHttpModule } from "./modules/fetchHttp.js";
import { CalcExtractHeadlineModule } from "./modules/calcExtractHeadline.js";
import { FileReadModule } from "./modules/fileRead.js";
import { TimeoutModule } from "./modules/timeout.js";
import { FutureModule } from "./modules/future.js";
import { JoinModule } from "./modules/join.js";

/**
 * 기본 모듈이 등록된 Registry 생성
 */
export function createDefaultRegistry(): ModuleRegistry {
  const registry = new ModuleRegistry();

  registry.register("FETCH", new FetchDefaultModule());
  registry.register("CALC", new CalcDefaultModule());
  registry.register("CALL", new CallDefaultModule());
//   registry.register("AI", new AiDefaultModule());
  registry.register("FETCH_fetchHttp", new FetchHttpModule());
  registry.register("CALC_extractHeadline", new CalcExtractHeadlineModule());
  registry.register("AI", new AiOpenAIModule());
  registry.register("FETCH_file", new FileReadModule());
  registry.register("CALL_timeout", new TimeoutModule());
  registry.register("CALL_future", new FutureModule());
  registry.register("CALL_join", new JoinModule());

  return registry;
}

/**
 * 엔진 전체 실행
 */
export async function runQplan(
  script: string,
  registry: ModuleRegistry = createDefaultRegistry(),
  ctx: ExecutionContext = new ExecutionContext()
): Promise<ExecutionContext> {
  // 1. Tokenize
  const tokens = tokenize(script);

  // 2. Parse (AST 생성)
  const parser = new Parser(tokens);
  const ast = parser.parse();

  // 3. Execute
  const executor = new Executor(registry);
  const resultContext = await executor.run(ast, ctx);

  return resultContext;
}

// 편의 export
export {
  ExecutionContext,
  ModuleRegistry,
  Executor,
  Parser,
  tokenize,
};
