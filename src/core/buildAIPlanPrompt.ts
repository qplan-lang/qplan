import { ModuleRegistry } from "./moduleRegistry.js";

/**
 * buildAIPlanPrompt(requirement: string, registry: ModuleRegistry)
 * ---------------------------------------------------------------
 * 사용자의 요구(requirement)를 기반으로
 * AI에게 qplan DSL 실행계획을 작성하도록 지시하는 프롬프트 생성함수.
 *
 * AI는 qplan 스펙을 모르므로, qplan 문법/사용법/모듈목록을 함께 전달해야 함.
 */
export function buildAIPlanPrompt(requirement: string, registry: ModuleRegistry) {
  // 현재 등록된 모듈 목록을 동적으로 가져옴
  const modules = registry.list();

  const moduleText = modules
    .map(m => {
      const usageTxt = m.usage ? `\n  예시:\n${indent(m.usage.trim(), 4)}` : "";
      const inputsTxt = m.inputs ? `\n  입력값: ${m.inputs.join(", ")}` : "";
      return `- ${m.id}: ${m.description ?? ""}${inputsTxt}${usageTxt}`;
    })
    .join("\n\n");

  return `
당신은 사용자의 요구를 분석하여 **qplan DSL 실행계획**을 작성하는 전문가입니다.

아래 요구사항을 만족하는 **qplan 스크립트만** 출력하십시오.
설명, 해설, 자연어 문장 등은 절대로 출력하지 마십시오.
코드 블록(\`\`\`)도 사용하지 마십시오.
오직 순수한 qplan 명령들만 출력하십시오.

-----------------------------------------
qplan DSL 개요
-----------------------------------------
qplan은 ActionModule 기반 워크플로우 언어입니다.

qplan 명령 형식:
  <moduleName> key=value key=value -> outputVar

기능 요약:
- Action 실행 (모듈 이름 뒤 옵션으로 op 지정 가능)
- If 조건문 (>, <, >=, <=, ==, !=, EXISTS, NOT_EXISTS)
- Each 반복문 (each item in iterable { ... } / each (item, idx) in iterable { ... })
- Each 반복문에서 stop/skip 제어
- Parallel 병렬 실행 (concurrency, ignoreErrors)
- Future 생성
- Join(Promise.all)
- ctx 변수 참조 (문자열 값이 ctx key와 동일하면 변수로 취급)

값 타입:
- 숫자
- 문자열
- JSON 배열/객체
- ctx 변수명

-----------------------------------------
사용 가능한 모듈 목록
-----------------------------------------
${moduleText}

-----------------------------------------
사용자 요구사항
-----------------------------------------
${requirement.trim()}

-----------------------------------------
생성 규칙
-----------------------------------------
- 오직 qplan DSL만 출력하세요.
- 존재하지 않는 모듈을 사용하지 마세요.
- 제공된 모듈의 usage와 inputs 규칙을 따라야 합니다.
- 가능한 한 정확하고 간결하게 작성하세요.
- 자연어, 설명, 주석을 절대로 넣지 마세요.
- 코드블록(\`\`\`)을 절대로 넣지 마세요.

-----------------------------------------
출력 형식
-----------------------------------------
qplan 스크립트만 출력:

예시)
math op="add" a=1 b=2 -> x
echo value=x -> result
`.trim();
}

/** 문자열 들여쓰기 유틸 */
function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map(line => pad + line)
    .join("\n");
}
