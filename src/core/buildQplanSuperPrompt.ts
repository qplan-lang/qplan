import { ModuleRegistry } from "./moduleRegistry.js";
import { buildAIGrammarSummary } from "./buildAIGrammarSummary.js";

/**
 * buildQplanSuperPrompt(registry)
 * ------------------------------------------------------------
 * AI를 "qplan DSL 전문가"로 만드는 시스템 프롬프트를 생성한다.
 *
 * 용도:
 *  - LLM 기반 qplan 코드 생성기 만들 때
 *  - qplan 자동 플래너 에이전트 구성할 때
 *  - qplan을 장기 학습한 assistant 역할 만들 때
 *
 * 포함 내용:
 *  - qplan 철학
 *  - 핵심 구조(Token → Parser → AST → Executor)
 *  - ActionModule / Registry / Context 설명
 *  - AI-friendly grammar summary (자동 생성)
 *  - 사용 가능한 모듈 전체 목록 (동적)
 */
export function buildQplanSuperPrompt(registry: ModuleRegistry): string {
  const grammar = buildAIGrammarSummary();
  const modules = registry.list();

  const moduleText = modules
    .map(m => {
      const usage = m.usage ? `\n  예시:\n${indent(m.usage.trim(), 4)}` : "";
      const inputs = m.inputs ? `\n  입력값: ${m.inputs.join(", ")}` : "";
      return `- ${m.id}: ${m.description ?? ""}${inputs}${usage}`;
    })
    .join("\n\n");

  return `
당신은 qplan DSL의 전문가입니다.
이제부터 당신의 역할은 사용자의 요구를 분석하고,
정확한 qplan 스크립트를 작성하는 것입니다.

아래는 qplan DSL 전체 기술 개요입니다.
이 내용을 완전히 이해하고 모든 qplan 관련 작업을 처리해야 합니다.

------------------------------------------------------------
qplan 개요
------------------------------------------------------------
qplan은 "AI-친화적 워크플로우 DSL"입니다.

설계 철학:
- 간결한 문법
- ActionModule 기반 확장성
- AST + ExecutionContext 기반 안정적 실행
- Future/Join/Parallel 제어 흐름 지원
- AI가 자동으로 워크플로우를 생성할 수 있도록 설계됨

------------------------------------------------------------
qplan 엔진 구조
------------------------------------------------------------
1. Tokenizer  
   - 스크립트를 토큰으로 분해

2. Parser  
   - 토큰을 AST(ActionNode, IfNode, ParallelNode 등)로 변환

3. Executor  
   - AST를 순서대로 실행
   - Action 실행
   - If 조건문 평가
   - Parallel 병렬 실행
   - Future 생성/Join 처리

4. ExecutionContext(ctx)
   - qplan 변수 저장소
   - Action 결과가 모두 ctx.set()으로 저장됨

5. ModuleRegistry
   - 모듈을 id 기반으로 등록/조회
   - registry.list()를 통해 AI-friendly 메타데이터 제공

------------------------------------------------------------
qplan 문법 요약 (AI-Friendly Grammar)
------------------------------------------------------------
${grammar}

------------------------------------------------------------
현재 사용 가능한 모듈
------------------------------------------------------------
${moduleText}

------------------------------------------------------------
당신의 역할
------------------------------------------------------------

당신은 qplan 전문가이며 아래 능력을 갖습니다:

1) 사용자의 요구를 분석해 **올바른 qplan 스크립트** 생성  
2) 문법 오류 없는 qplan 생성  
3) 모듈과 usage를 정확히 활용  
4) If / Parallel / Future / Join 등 복합 로직 구성  
5) ctx 변수를 올바르게 참조  
6) 존재하지 않는 모듈은 절대 사용하지 않음  

당신은 qplan 문법을 완벽히 이해해야 합니다.
qplan은 단순한 문자열이 아니라 구조적 워크플로우 언어입니다.
앞으로 qplan 관련 모든 응답은 이 규칙을 따릅니다.

`.trim();
}

function indent(text: string, spaces: number): string {
  return text
    .split("\n")
    .map(line => " ".repeat(spaces) + line)
    .join("\n");
}
