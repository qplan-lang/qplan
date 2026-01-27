/**
 * ActionModule
 * -----------------------------------------
 * QPlan 모듈 타입 정의.
 *
 * - 함수형/객체형 모두 지원.
 * - id / description / usage / inputs 는 optional.
 *   (기본 모듈은 모두 작성 → AI-friendly)
 *   (개발자 임시 테스트 모듈은 id 없이도 동작)
 */

import { ExecutionContext } from "./executionContext.js";

export interface ModuleMeta {
  id?: string;                 // 모듈 이름
  description?: string;        // AI가 사용법 파악할 설명
  usage?: string;              // 호출 예시
  inputs?: string[];           // 파라미터 이름 목록
  inputType?: Record<string, any>; // 입력 타입/스키마 설명
  outputType?: Record<string, any>; // 반환 타입/스키마 설명
  excludeInPrompt?: boolean;  // 프롬프트에 노출 제외
}

export type ModuleInputs = Record<string, any>;

export type ModuleResult<TOutput = unknown> = TOutput | Promise<TOutput>;

export type ModuleExecute<
  TInputs extends ModuleInputs = ModuleInputs,
  TOutput = unknown
> = (inputs: TInputs, ctx: ExecutionContext) => ModuleResult<TOutput>;

export type ActionModule<
  TInputs extends ModuleInputs = ModuleInputs,
  TOutput = unknown
> =
  // 함수형 모듈
  (ModuleExecute<TInputs, TOutput> & ModuleMeta)
  |
  // 객체형/클래스형 모듈
  (ModuleMeta & {
    execute: ModuleExecute<TInputs, TOutput>;
  });
