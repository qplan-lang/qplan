/**
 * ActionModule
 * -----------------------------------------
 * qplan 모듈 타입 정의.
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
  usage?: string;              // DSL 호출 예시
  inputs?: string[];           // 파라미터 이름 목록
}

export type ActionModule =
  // 함수형 모듈
  ((inputs: Record<string, any>, ctx: ExecutionContext) => any | Promise<any>) &
    ModuleMeta
  |
  // 객체형/클래스형 모듈
  (ModuleMeta & {
    execute(
      inputs: Record<string, any>,
      ctx: ExecutionContext
    ): any | Promise<any>;
  });
