# 09-ai-integration.md

## 1. 목적
QPlan은 “AI가 스크립트를 작성하고 엔진이 실행”하는 시나리오를 염두에 두고 설계되었다. 이 문서는 LLM과 QPlan을 연결할 때 필요한 정보, `buildAIPlanPrompt`/`buildQplanSuperPrompt` 사용법, 모듈 메타데이터 준비 방법을 다룬다.

## 2. 최소 제공 정보
```ts
const modules = registry.list();
```
`registry.list()` 결과에는 `id`, `description`, `usage`, `inputs` 가 포함되며 LLM에 전달할 모듈 가이드의 핵심이 된다. 모듈 메타데이터를 충실히 작성할수록 AI가 정확한 QPlan 명령을 생성한다.

## 3. buildAIPlanPrompt() 워크플로우
```ts
import { buildAIPlanPrompt, runQplan, registry, setUserLanguage } from "qplan";

registry.register(customModule);
setUserLanguage("ko"); // 임의 문자열 가능
const prompt = buildAIPlanPrompt("파일을 읽어 평균을 계산해줘", { registry });
const aiScript = await callLLM(prompt);
const ctx = await runQplan(aiScript, {
  registry,
  env: { tenant: "acme" },
  metadata: { requestId: "req-42" },
});
console.log(ctx.toJSON());
```
`buildAIPlanPrompt(requirement, { registry, language })` 는 다음 정보를 자동으로 포함한다.
1. QPlan 언어 개요와 “Step 내부에서만 Action 실행” 같은 규칙
2. `buildAIGrammarSummary()` 로 생성한 AI-friendly 문법 요약
3. registry.list() 로 얻은 모듈 메타데이터(`usage` 예시 포함)
4. onError/jump/dot-path 등 실행 규칙 및 출력 형식

LLM은 이 프롬프트를 기반으로 Step 기반 QPlan 스크립트만 출력하게 된다.

## 4. buildQplanSuperPrompt()
장기적인 LLM 시스템 프롬프트가 필요하면 `buildQplanSuperPrompt(registry)` 를 사용한다. 이 함수는 QPlan 철학, 엔진 구조, Grammar 요약, 모듈 목록을 모두 담은 “슈퍼 프롬프트”를 생성한다. `buildAIPlanPrompt` 보다 길지만 반복 대화나 Agent 세팅에 유리하다.

## 5. AI 프롬프트 구성 팁
- **모듈 설명/usage 명확히 하기**: AI는 description/usage를 그대로 읽어 명령을 구성한다. 예시를 실제 QPlan 코드로 작성하자.
- **필요한 모듈만 등록**: 사용하지 않을 모듈은 registry에서 제외하면 AI 프롬프트 길이를 줄이고 오용을 방지할 수 있다.
- **요구사항 템플릿화**: 사용자 요청을 정제한 문자열을 `requirement` 로 넘겨 AI가 필요한 컨텍스트를 충분히 받도록 한다.
- **언어 지정**: `buildAIPlanPrompt()` 호출 전에 `setUserLanguage("<언어 문자열>")` 을 호출하거나 `{ language: "<언어>" }` 옵션을 넘겨 Step 문자열 언어를 제어한다.
- **출력 형식 강조**: buildAIPlanPrompt는 “QPlan 코드만 출력” 규칙을 포함하지만, 추가로 시스템/사용자 프롬프트에서 동일 규칙을 반복하면 안전하다.

## 6. 실행 전 검증
AI가 생성한 스크립트는 실행 전에 검사하는 것이 좋다.
```ts
import { validateQplanScript } from "qplan";

const result = validateQplanScript(aiScript);
if (!result.ok) {
  console.error("invalid script", result.error, result.line);
  return;
}
await runQplan(aiScript);
```
- 문법/Step 구조/jump 대상 오류를 `validateQplanScript` 로 먼저 잡아내면 안전하다.
- CI 파이프라인에서는 `npm run validate -- script.qplan` 형태로 자동 검사할 수 있다.

## 7. Step 이벤트와 AI 모니터링
`runQplan(script, { env, metadata, stepEvents })` 옵션으로 플랜 시작/종료 + Step 시작/종료/오류/재시도/점프 이벤트를 수신할 수 있다. 각 이벤트는 `StepEventRunContext` 를 전달하므로 별도 WeakMap 없이 사용자/세션 정보를 추적할 수 있다.

```ts
await runQplan(aiScript, {
  env: { userId: "user-88" },
  stepEvents: {
    onPlanStart(plan, context) {
      log(`plan ${plan.runId}`, plan.totalSteps, context?.env);
    },
    onStepStart(info, context) { log(`start ${info.stepId}`, info.path, context?.metadata); },
    onStepError(info, err) { alert(`error ${info.stepId}: ${err.message}`); },
    onPlanEnd(plan) { log(`plan end ${plan.runId}`); },
  }
});
```

## 8. 권장 전략 요약
1. 기본 모듈 + 필요한 확장 모듈만 registry에 등록하고 `registry.list()` 를 LLM에 제공한다.
2. `buildAIPlanPrompt(requirement)` 로 사용자 요청을 구조화된 프롬프트로 변환한다.
3. AI 결과를 `validateQplanScript`/`runQplan` 으로 검증/실행한다.
4. Step 이벤트 로그와 ctx 결과를 UI/백엔드에서 활용해 진행률과 성공 여부를 사용자에게 보여준다.

이 흐름을 따르면 “AI thinks, QPlan executes” 패턴을 빠르게 구현할 수 있다.

## 9. 문법 검증 + 재시도 루프
LLM이 생성한 스크립트가 항상 완벽하진 않다. `validateQplanScript()` 를 이용해 자동 검증/재시도 루프를 구성하면 안정적이다.

1. **생성** – `buildAIPlanPrompt` 로 생성한 프롬프트를 LLM에 전달해 스크립트를 받는다.
2. **검증** – `const result = validateQplanScript(script)` 실행.
   - `result.ok === true` 면 `runQplan` 으로 실행.
   - `result.ok === false` 면 `result.error` 와 `result.issues` 를 확인한다. 각 issue 에는 `line` 과 `hint`(예: “Create 'total' before using it”) 가 포함되어 수정 방향을 명확히 알려 준다.
3. **재시도** – hint 내용을 LLM에게 피드백으로 전달해 “이 변수부터 만들어 달라”, “jump 대상 step 을 추가해 달라” 처럼 정확히 요청하고 다시 생성한다.
4. **제한/로깅** – 최대 재시도 횟수를 정하고, 실패한 스크립트 + hint 를 함께 저장/노출해 디버깅이나 사용자 알림에 활용한다.

이 과정을 두면 LLM이 스스로 오류를 교정하며 유효한 QPlan 을 만들 때까지 빠르게 수렴시킬 수 있다.
