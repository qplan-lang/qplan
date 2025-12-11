/**
 * qplan 엔트리 포인트
 * -----------------------------------------
 * 사용 예:
 *
 * import { runQplan, registry } from "qplan";
 *
 * registry.registAll([
 *   { id: "echo", module: (inputs) => inputs },
 *   { id: "add", module: ({ a, b }) => a + b }
 * ]);
 *
 * const ctx = await runQplan(`
 *   echo msg="hello" -> x
 *   add a=3 b=4 -> y
 * `);
 *
 * console.log(ctx.toJSON());
 */

import { tokenize } from "./core/tokenizer.js";
import { Parser } from "./core/parser.js";
import { Executor } from "./core/executor.js";
import { ModuleRegistry } from "./core/moduleRegistry.js";
import { ExecutionContext } from "./core/executionContext.js";
import { basicModules } from "./modules/index.js";

// 🎯 외부에서 모듈 등록 가능하도록 registry export
export const registry = new ModuleRegistry();

// 기본모듈 등록
registry.registerAll(basicModules);

/**
 * DSL 스크립트 실행 함수
 */
export async function runQplan(script: string) {
  // 1) Tokenize
  const tokens = tokenize(script);

  // 2) Parse → AST
  const parser = new Parser(tokens);
  const ast = parser.parse();

  // 3) Execute
  const ctx = new ExecutionContext();
  const executor = new Executor(registry);

  await executor.run(ast, ctx);
  return ctx;
}

// 기본 모듈을 자동 등록하려면 여기에서 registry.registAll(defaultModules) 호출하면 됨
