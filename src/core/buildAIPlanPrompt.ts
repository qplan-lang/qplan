import { ModuleRegistry } from "./moduleRegistry.js";

export type PromptLanguage = string;

/**
 * buildAIPlanPrompt(requirement: string, registry: ModuleRegistry, language?: PromptLanguage)
 * ------------------------------------------------------------------------------------------
 * Generates a Korean-style system prompt for QPlan planning, while dynamically
 * indicating the language in which the model should write string literals/descriptions.
 */
export function buildAIPlanPrompt(
  requirement: string,
  registry: ModuleRegistry,
  language: PromptLanguage = "en"
) {
  const modules = registry.list();
  const moduleText = modules
    .map(m => {
      const usageTxt = m.usage ? `\n  예시:\n${indent(m.usage.trim(), 4)}` : "";
      const inputsTxt = m.inputs ? `\n  입력값: ${m.inputs.join(", ")}` : "";
      return `- ${m.id}: ${m.description ?? ""}${inputsTxt}${usageTxt}`;
    })
    .join("\n\n");

  const languageLabel = language || "English";
  const trimmedRequirement = requirement.trim();

  return `
당신은 사용자의 요구를 분석하여 QPlan Language로 실행 계획을 작성하는 전문가입니다.

아래 요구사항을 만족하는 QPlan 스크립트만 출력하십시오.
설명, 해설, 자연어 문장 등은 절대로 출력하지 마십시오.
코드 블록(\`\`\`)도 사용하지 마십시오.
오직 순수한 QPlan 명령들만 출력하십시오.

-----------------------------------------
QPlan Language 개요
-----------------------------------------
QPlan은 Step 기반 워크플로우 언어로, 모든 Action은 반드시 step 블록 내부에서 실행됩니다.

기능 요약:
- Step 정의: step id="..." desc="..." type="..." onError="..." -> output { ... }
  - onError: fail(기본), continue, retry=N, jump="stepId"
  - jump to="stepId" 로 다른 Step으로 이동 (블록 간 이동 가능)
  - step 내부에 다른 step 을 중첩(Sub-step)하여 계층 구조를 만들 수 있음
  - 각 step 은 onError 정책으로 fail / continue / retry / jump 흐름을 제어
  - step 헤더의 \`-> resultVar\` 에 step 결과를 저장하며, 생략하면 마지막 Action 결과가 기본으로 활용됨
  - \`return key=value ...\` 로 step 결과 객체를 명시적으로 구성할 수 있음
- Action 실행: moduleName key=value ... -> outVar 형태
  - 문자열은 "..." 로 감싸고, ctx 변수를 참조할 때는 해당 변수명을 그대로 value 로 적되 따옴표를 쓰지 않습니다.
  - 모든 Action은 반드시 step 블록 내부에 위치해야 하며, 독립 실행은 허용되지 않습니다.
- \`var\` 모듈은 숫자/문자열/JSON 리터럴만 value 로 허용됩니다. \`var value=diff -> copy\` 처럼 기존 ctx 변수를 다른 이름으로 복사하려고 쓰면 오류가 나므로, 그런 경우에는 \`set copy = diff\` (선행 초기화 필요) 또는 다른 모듈을 사용하십시오.
- If 조건문 (>, <, >=, <=, ==, !=, EXISTS, NOT_EXISTS) + and/or/not 조합, 괄호 우선순위 지원
- Each 반복문 (each item in iterable { ... } / each (item, idx) in iterable { ... })
- Each 반복문에서 stop/skip 제어
- Parallel 병렬 실행 (concurrency, ignoreErrors)
- Future 생성
- Join(Promise.all)
- ctx 변수 참조 (문자열 값이 ctx key와 동일하면 변수로 취급)
- Set 문: \`set target = expression\` 으로 ctx 변수에 연산 결과를 저장 (+, -, *, /, 괄호, 리터럴/ctx 조합 지원)
- Return 문: \`return key=expression ...\` 으로 Step 결과 객체를 명시적으로 구성

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
${trimmedRequirement}

-----------------------------------------
생성 규칙
-----------------------------------------
- 오직 QPlan Language만 출력하세요.
- QPlan script내 다른 프로그래밍 언어나 스크립트는 추가할 수 없습니다.
- 모든 Action은 반드시 step 블록 안에 배치하십시오.
- 필요 시 여러 step을 사용하여 상위/하위 단계 구조화, jump, onError 정책을 활용하십시오.
- 존재하지 않는 모듈을 사용하지 마세요.
- 제공된 모듈의 usage와 inputs 규칙을 따라야 합니다.
- 가능한 한 정확하고 간결하게 작성하세요.
- 문자열/desc 등 자연어 텍스트는 ${languageLabel}로 작성하세요.
- 자연어 설명, 주석을 절대로 넣지 마세요.
- 코드블록(\`\`\`)을 절대로 넣지 마세요.
- step 블록 목록을 모두 출력했다면 즉시 종료하고, 뒤에 요약/정리/추가 텍스트(예: "A -> B")를 붙이지 마세요.
- 동일한 step 을 반복하거나 빈 step 을 만들지 마세요.
- Action 결과 변수 이름도 재사용에 주의하고, 필요할 때만 명시적으로 \`return\` 으로 객체를 구성하세요.
- step의 id로는 결과값에 접근할수 없습니다. \`stepId.value\` 같은 문법은 존재하지 않습니다.
- ctx 변수나 Step 결과의 하위 필드는 \`stats.average\` 처럼 점(.) 표기로 접근할 수 있습니다. 필요한 필드는 해당 step 내에서 \`return average=...\` 형태로 노출하거나, JSON 모듈을 통해 구성해 두세요.
- 의미 없는 wrapper step 을 만들지 말고, 요구사항을 해결하는 데 필요한 단계만 작성하세요.
- 각 step 헤더의 출력 변수(\`-> resultVar\`)는 고유한 이름을 사용하세요. 같은 이름을 반복하면 이전 결과가 ctx 에서 덮어써집니다.

-----------------------------------------
출력 형식
-----------------------------------------
QPlan 스크립트만 출력:

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
