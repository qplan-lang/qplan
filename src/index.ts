/**
 * QPlan 엔트리 포인트
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
import { ParserError } from "./core/parserError.js";
import { ASTRoot } from "./core/ast.js";
import type { StepEventEmitter } from "./step/stepEvents.js";
import { validateSemantics } from "./core/semanticValidator.js";
import type { SemanticIssue } from "./core/semanticValidator.js";
import { buildAIPlanPrompt as buildPrompt } from "./core/buildAIPlanPrompt.js";

// 🎯 외부에서 모듈 등록 가능하도록 registry export
export const registry = new ModuleRegistry();

// 기본모듈 등록
registry.registerAll(basicModules);

/**
 * 기본 registry(또는 전달된 registry)를 기반으로
 * AI 실행계획 프롬프트를 생성한다.
 */
export function buildAIPlanPrompt(requirement: string) {
  return buildPrompt(requirement, registry);
}

/**
 * QPlan 스크립트 실행 함수
 */
export interface RunQplanOptions {
  stepEvents?: StepEventEmitter;
}

export async function runQplan(script: string, options: RunQplanOptions = {}) {
  // 1) Tokenize
  const tokens = tokenize(script);

  // 2) Parse → AST
  const parser = new Parser(tokens);
  const ast = parser.parse();

  // 3) Execute
  const ctx = new ExecutionContext();
  const executor = new Executor(registry, options.stepEvents);

  await executor.run(ast, ctx);
  return ctx;
}

export type ValidationIssue = SemanticIssue;

export type QplanValidationResult =
  | { ok: true; ast: ASTRoot }
  | { ok: false; error: string; line?: number; issues?: ValidationIssue[] };

/**
 * QPlan 스크립트 문법만 검증하고 싶을 때 사용.
 * 실행하지 않고 Tokenize + Parse 단계에서 오류 여부만 반환한다.
 */
export function validateQplanScript(script: string): QplanValidationResult {
  try {
    const tokens = tokenize(script);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const semanticIssues = validateSemantics(ast);
    if (semanticIssues.length > 0) {
      const first = semanticIssues[0];
      return {
        ok: false,
        error: first.message,
        line: first.line,
        issues: semanticIssues,
      };
    }
    return { ok: true, ast };
  } catch (err) {
    if (err instanceof ParserError) {
      return { ok: false, error: err.message, line: err.line };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Unknown validation error" };
  }
}

// 기본 모듈을 자동 등록하려면 여기에서 registry.registAll(defaultModules) 호출하면 됨

export { defaultStepEventEmitter } from "./step/stepEvents.js";
export type { StepEventEmitter } from "./step/stepEvents.js";
export type { StepEventInfo } from "./step/stepTypes.js";
