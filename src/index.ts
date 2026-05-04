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
import type { ModuleListOptions } from "./core/moduleRegistry.js";
import { ExecutionContext } from "./core/executionContext.js";
import { ParserError } from "./core/parserError.js";
import { ASTRoot } from "./core/ast.js";
import type { StepEventEmitter, PlanEventInfo, StepEventRunContext } from "./step/stepEvents.js";
import { PlanStopSignal } from "./step/stepSignals.js";
import { AbortError as ExecutionAbortError } from "./core/executionController.js";
import { validateSemantics, parseParamsMeta } from "./core/semanticValidator.js";
import type { SemanticIssue } from "./core/semanticValidator.js";
import { buildAIPlanPrompt as buildPrompt } from "./core/buildAIPlanPrompt.js";
import type { ModuleDetail, PromptLanguage } from "./core/buildAIPlanPrompt.js";
import { QPlan } from "./qplan.js";
import { validateScript, type QplanValidationResult } from "./core/qplanValidation.js";

// 🎯 외부에서 모듈 등록 가능하도록 registry export
export const registry = new ModuleRegistry();

let userLanguage: PromptLanguage = "en";

export function setUserLanguage(language: PromptLanguage) {
  userLanguage = language;
}

export function getUserLanguage(): PromptLanguage {
  return userLanguage;
}

/**
 * 기본 registry(또는 전달된 registry)를 기반으로
 * AI 실행계획 프롬프트를 생성한다.
 */
export interface BuildAIPlanPromptOptions {
  registry?: ModuleRegistry;
  language?: PromptLanguage;
  moduleFilter?: ModuleListOptions;
  moduleDetail?: ModuleDetail;
}

export function buildAIPlanPrompt(
  requirement: string,
  options: BuildAIPlanPromptOptions = {}
) {
  const targetRegistry = options.registry ?? registry;
  const language = options.language ?? userLanguage;
  return buildPrompt(
    requirement,
    targetRegistry,
    language,
    options.moduleFilter,
    options.moduleDetail
  );
}

export function listRegisteredModules(
  targetRegistry: ModuleRegistry = registry,
  options: ModuleListOptions = {}
) {
  return targetRegistry.list({ includeExcluded: true, ...options });
}

/**
 * QPlan 스크립트 실행 함수
 */
export interface RunQplanOptions {
  registry?: ModuleRegistry;
  stepEvents?: StepEventEmitter;
  env?: Record<string, any>;
  metadata?: Record<string, any>;
  params?: Record<string, any>;
  runId?: string;
}

let runCounter = 0;

export async function runQplan(script: string, options: RunQplanOptions = {}) {
  // 1) Tokenize
  const tokens = tokenize(script);

  // 2) Parse → AST
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const paramsMeta = parseParamsMeta(ast.planMeta?.params);
  if (paramsMeta.hasEmpty || paramsMeta.invalid.length) {
    throw new Error("Invalid @params declaration");
  }
  if (paramsMeta.names.length) {
    const missing = paramsMeta.names.filter(name => !options.params || !(name in options.params));
    if (missing.length) {
      throw new Error(`Missing params: ${missing.join(", ")}`);
    }
  }

  const runId = options.runId ?? `run-${Date.now()}-${++runCounter}`;
  const execRegistry = options.registry ?? registry;
  const ctx = new ExecutionContext({
    env: options.env,
    metadata: options.metadata,
    runId,
  });
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      ctx.set(key, value);
    }
  }
  const executor = new Executor(execRegistry, options.stepEvents);
  const runContext: StepEventRunContext = {
    runId,
    script,
    ctx,
    registry: execRegistry,
    env: options.env,
    metadata: options.metadata,
    params: options.params,
  };

  try {
    await executor.run(ast, ctx, runContext);
  } catch (err) {
    if (err instanceof PlanStopSignal) {
      return ctx;
    }
    if (err instanceof ExecutionAbortError || (err instanceof Error && err.name === "AbortError")) {
      return ctx;
    }
    throw err;
  }
  return ctx;
}

export type ValidationIssue = SemanticIssue;
export type { QplanValidationResult } from "./core/qplanValidation.js";

/**
 * QPlan 스크립트 문법만 검증하고 싶을 때 사용.
 * 실행하지 않고 Tokenize + Parse 단계에서 오류 여부만 반환한다.
 */
export function validateQplanScript(script: string): QplanValidationResult {
  return validateScript(script);
}

// 기본 모듈을 자동 등록하려면 여기에서 registry.registAll(defaultModules) 호출하면 됨

export { defaultStepEventEmitter } from "./step/stepEvents.js";
export type {
  StepEventEmitter,
  PlanEventInfo,
  PlanStatus,
  StepEventRunContext,
} from "./step/stepEvents.js";
export type { StepEventInfo } from "./step/stepTypes.js";
export type { PromptLanguage } from "./core/buildAIPlanPrompt.js";
export type { ModuleDetail } from "./core/buildAIPlanPrompt.js";
export { QPlan } from "./qplan.js";
export { ModuleRegistry } from "./core/moduleRegistry.js";
export type {
  ModuleCategoryInfo,
  ModuleListOptions,
  ModuleRegistryOptions,
} from "./core/moduleRegistry.js";
export type {
  ActionModule,
  ModuleMeta,
  ModuleInputs,
  ModuleResult,
  ModuleExecute,
} from "./core/actionModule.js";
export { ExecutionContext } from "./core/executionContext.js";
export {
  ExecutionController,
  ExecutionState,
  AbortError,
  TimeoutError,
} from "./core/executionController.js";
export type {
  ExecutionSnapshot,
  ExecutionControllerOptions,
  BlockStackFrame,
} from "./core/executionController.js";
