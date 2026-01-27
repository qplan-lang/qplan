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
  const modules = registry.list({ includeExcluded: false });
  const moduleText = modules
    .map(m => {
      const usageTxt = m.usage ? `\n  예시:\n${indent(m.usage.trim(), 4)}` : "";
      const inputsTxt = m.inputs ? `\n  입력값: ${m.inputs.join(", ")}` : "";
      const inputTypeTxt = m.inputType
        ? `\n  입력타입: ${formatType(m.inputType)}`
        : "";
      const outputTypeTxt = m.outputType
        ? `\n  출력타입: ${formatType(m.outputType)}`
        : "";
      return `- ${m.id}: ${m.description ?? ""}${inputsTxt}${inputTypeTxt}${outputTypeTxt}${usageTxt}`;
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
- Step 정의: step id="..." desc="..." type="..." onError="..." [-> resultVar] { ... }
  - onError: fail(기본), continue, retry=N, jump="stepId"
  - jump to="stepId" 로 다른 Step으로 이동 (블록 간 이동 가능)
  - step 내부에 다른 step 을 중첩(Sub-step)하여 계층 구조를 만들 수 있음
  - 각 step 은 onError 정책으로 fail / continue / retry / jump 흐름을 제어
  - Step 결과는 기본적으로 Step ID에 저장되고(\`ctx[runId][stepId]\`), \`-> resultVar\` 를 지정하면 해당 namespace를 사용한다. Step 내부에서 생성한 action output 들이 객체 형태로 노출되며, 필요 시 \`return key=value ...\` 또는 \`return key value\` 축약형으로 명시적 구조를 지정할 수 있다.
  - step 블록 내에서 stop은 Plan 중단, skip은 Step 중단용으로 사용됨
  - 식별자 규칙: 모듈 이름, 변수/Action output, \`return\` key, \`set\` 대상 등은 유니코드 문자/숫자/언더스코어로 구성할 수 있으며, 첫 글자는 문자 또는 언더스코어여야 한다.
- Action 실행: moduleName key=value ... -> outVar 형태
  - 문자열은 "..." 로 감싸고, ctx 변수를 참조할 때는 해당 변수명을 그대로 value 로 적되 따옴표를 쓰지 않습니다.
  - 모든 Action은 반드시 step 블록 내부에 위치해야 하며, 독립 실행은 허용되지 않습니다.
- \`var\` 모듈은 숫자/문자열/JSON 리터럴만 value 로 허용됩니다. \`var value=diff -> copy\` 처럼 기존 ctx 변수를 다른 이름으로 복사하려고 쓰면 오류가 나므로, 그런 경우에는 \`set copy = diff\` (선행 초기화 필요) 또는 다른 모듈을 사용하십시오.
- If 조건문 (>, <, >=, <=, ==, !=, EXISTS, NOT_EXISTS) + and/or/not 조합, 괄호 우선순위 지원. 단항 조건 \`if <expr>\` 는 truthy/falsy 기준으로 판단
- Each 반복문 (each item in iterable { ... } / each (item, idx) in iterable { ... })
- Each/While 반복문에서 break(루프 탈출)/continue(다음 반복) 제어.
- Parallel 병렬 실행 (concurrency, ignoreErrors)
- Future 생성
- Join(Promise.all)
- ctx 변수 참조 (문자열 값이 ctx key와 동일하면 변수로 취급)
- Set 문: \`set target = expression\` 으로 ctx 변수에 연산 결과를 저장 (+, -, *, /, 괄호, 리터럴/ctx 조합 지원)
- Return 문: \`return key=expression ...\` 또는 \`return key value ...\` (축약형, 항목 구분은 공백/콤마 모두 허용)으로 Step 결과를 구성. 생략하면 step 내부 action output 들이 자동으로 객체화되어 \`resultNamespace.outputName\`(기본 namespace 는 step ID) 으로 접근 가능.
- 외부 입력 변수가 필요한 경우 \`@params "a,b,c"\` 메타 라인을 스크립트 상단 또는 \`plan { ... }\` 내부에 선언하십시오.

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
- 하나의 step에 전 과정을 몰아넣지 말고, 데이터 수집/전처리/분석/보고 등 **주요 목적별**로 step을 분리하세요. Step 내부에는 서로 긴밀히 연관된 action만 두세 개 정도 배치하고, 역할이 다르면 새로운 step을 만드세요.
- 동일한 step 을 반복하거나 빈 step 을 만들지 마세요.
- Action 결과 변수 이름도 재사용에 주의하고, 필요할 때만 명시적으로 \`return\` 으로 객체를 구성하세요.
- ctx 변수나 Step 결과의 하위 필드는 \`stats.average\`, \`resultNamespace.value\` 처럼 점(.) 표기로 접근할 수 있습니다. Step 내부에서 생성한 action output 은 자동으로 \`resultNamespace.outputName\` 형태로 노출되며(기본 namespace 는 step ID), 추가 필드가 필요하면 \`return gear, accounts total=sum\` 처럼 명시적으로 반환하세요.
- 의미 없는 wrapper step 을 만들지 말고, 요구사항을 해결하는 데 필요한 단계만 작성하세요.
- Step ID는 실행 전체에서 유일해야 하며, 다른 step에서 해당 ID를 이용해 결과를 참조합니다. 의미 없는 이름을 사용하지 마세요.
- Step 결과를 외부에서 사용할 때는 \`resultNamespace.outputName\` 형태를 사용하세요. \`return\` 구문 없이도 Step 내 Action output 이 자동으로 객체화되며, 필요 시 \`return gear, accounts total=sum\` 처럼 축약/명시적 형태를 사용해 필드를 노출하세요. 다른 namespace 가 필요하면 Step 헤더에 \`-> customName\` 을 선언하세요. namespace 를 바꿔도 Step ID 이름으로 동일 객체가 생성되므로 두 이름 모두 접근 가능합니다.
- 외부 입력 변수를 사용할 경우 반드시 \`@params\`에 선언해야 하며, 선언하지 않으면 validation 오류가 발생합니다.

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

function formatType(typeValue: Record<string, any>): string {
  try {
    return JSON.stringify(typeValue);
  } catch {
    return String(typeValue);
  }
}
