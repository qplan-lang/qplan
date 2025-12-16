# QPlan — AI Planning Language & Execution Engine  
경량 AI Planning Language & 실행 엔진

---

## 1. Introduction

QPlan은 **AI가 작성하고 시스템이 실행하는** 경량 AI Planning Language이다.  
데이터 수집, 분석, 자동화, RPA 등 다양한 도메인에서  
**플랜을 언어로 표현하고 실행**할 수 있도록 설계되었다.

일반적인 AI(LLM)는 자연어 요청을 이해하고 설명하거나 답변하는 데 매우 뛰어나지만,  
"검색 → 필터 → 사용자 선택 → 결제" 와 같은 **실제 기능 실행**은 직접 수행하지 못합니다.

QPlan은 이 한계를 해결합니다.  
AI가 작성한 계획을 QPlan 스크립트로 받아, 실제 코드처럼 단계별로 실행합니다.

즉,

> **AI가 생각하고(QPlan 계획 생성), QPlan이 실행합니다.**

---

## 3. Why QPlan?

### 3.1 문제

LLM이 "곰돌이 티셔츠 사줘" 같은 요청을 받을 때:
- 어디서 검색해야 하는지  
- 어떤 조건으로 필터링해야 하는지  
- 어떤 로직을 따라 실행해야 하는지  
알고 있지만, **실행 능력**은 없습니다.

### 3.2 해결

QPlan은 다음 흐름을 제공합니다:

1. 사용자 요청  
2. `buildAIPlanPrompt()` 로 AI에 실행 계획 요청  
3. AI는 step 기반 QPlan 실행 계획을 생성  
4. QPlan 엔진이 실제 기능 실행  
5. Step 결과를 UI/시스템에서 사용

---

## 4. 매우 간단한 예시

- 사용자 요청:  
  > “곰돌이가 그려진 흰색 티셔츠를 구매해줘”

- 시스템(QPlan + AI):  
  1) 흰색 티셔츠 검색  
  2) 곰돌이 프린트 필터  
  3) 사용자에게 상품 선택 요청  
  4) 결제 모듈 실행  

- 결과:  
  → **구매 완료**

이 예시는 QPlan의 핵심 사용 패턴을 가장 간단히 보여줍니다.

---

## 5. How It Works (High-Level)

```text
사용자 요구사항
     ↓
buildAIPlanPrompt (사용자 요구사항을 기준으로 QPlan요청 프롬프트를 생성)
     ↓
AI가 실행 계획 (QPlan script) 생성
     ↓
runQplan (script)
     ↓
각 Step 실행 (검색 / 필터 / 선택 / 결제 등)
```

---

## 6. QuickStart

### 6.1 📦 Install

```bash
npm install qplan
```

---

### 6.2 Create a Module

```ts
export const searchModule = {
  id: "search",
  description: "상품 검색",
  inputs: ["keyword"],
  async execute({ keyword }) {
    return await searchDB(keyword);
  }
};
```

---

### 6.3 Register Modules

```ts
// 가장 간단한 방법: 내장 전역 registry 활용
import { registry } from "qplan";
registry.register(searchModule);
registry.registerAll([filterModule, askUserModule, paymentModule]);

// 커스텀 registry를 쓰고 싶다면
const customRegistry = new ModuleRegistry(); // 기본 모듈 자동 포함
customRegistry.registerAll([
  searchModule,
  filterModule,
  askUserModule,
  paymentModule
]);
// 완전히 비어 있는 registry가 필요하면 new ModuleRegistry({ seedBasicModules: false }) 를 사용하세요.
```

---

### 6.4 Generate AI Plan

QPlan은 사용자 요구사항을 기반으로  
AI에게 실행 계획을 요청하기 위한 프롬프트를 자동 생성하는 함수를 제공합니다.

```ts
import { buildAIPlanPrompt, registry, setUserLanguage } from "qplan";

setUserLanguage("ko"); // 임의의 문자열(예: "en", "ja") 가능
const requirement = "곰돌이가 그려진 흰색 티셔츠를 구매해줘";
const prompt = buildAIPlanPrompt(requirement, { registry });

const aiScript = await callLLM(prompt);   // LLM을 호출하는 귀하의 코드
```

---

### 6.5 Execute the Plan

```ts
const ctx = await runQplan(aiScript, {
  registry,                       // 필요 시 커스텀 registry 주입
  env: { userId: "u-123" },      // 실행 컨텍스트 (ctx.getEnv() 로 접근)
  metadata: { sessionId: "s-456" },
  stepEvents: {
    async onPlanStart(plan, context) {
      console.log("plan start", plan.runId, plan.totalSteps, context?.env);
    },
    async onStepStart(info, context) {
      console.log("start:", info.stepId, info.path, context?.metadata);
    },
    async onStepEnd(info, result) { console.log("done:", info.stepId, result); },
    async onStepError(info, error) { console.error("error:", info.stepId, error); },
    async onStepRetry(info, attempt, error) {
      console.warn("retry:", info.stepId, "attempt", attempt, error.message);
    },
    async onStepJump(info, targetStepId) {
      console.log("jump:", info.stepId, "→", targetStepId);
    },
    async onPlanEnd(plan) { console.log("plan end", plan.runId); },
  }
});
```
stepEvents를 이용해 UI/CLI/로그와 연동해 진행률을 표시하거나, jump/retry/error 이벤트를 받을 수 있습니다. 각 이벤트는 실행 컨텍스트(`env`, `metadata`, `ctx`, `registry`)를 함께 전달하므로 별도 WeakMap 없이 사용자/세션 정보를 연결할 수 있습니다. `onStepRetry`, `onStepJump` 등의 기존 훅도 그대로 제공되며 동일한 `(info, ...args, context)` 형태로 호출됩니다.

---

## 7. Example Plan (AI Generated)

```qplan
step id="search" desc="흰색 티셔츠 검색" -> items {
  search keyword="흰색 티셔츠" -> result
  return list=result
}

step id="filter" desc="곰돌이 프린트 필터링" -> filtered {
  filter list=items.list pattern="곰돌이" -> out
  return list=out
}

step id="select" desc="사용자 선택" -> chosen {
  askUser list=filtered.list -> sel
  return item=sel
}

step id="checkout" desc="결제" {
  payment item=chosen.item
}
```

---

## 8. Concepts Overview

### 8.1 ActionModule

- 기능 단위(검색/필터/결제 등)를 표현하는 모듈입니다.  
- AI는 `id`, `description`, `inputs` 정보를 보고 이 모듈을 사용하는 QPlan 코드를 생성합니다.

### 8.2 ModuleRegistry

- 등록된 모듈 목록을 관리합니다.  
- `registry.list()` 를 통해 AI에게 제공할 메타데이터를 얻으며, `buildAIPlanPrompt(requirement, { registry })`, `runQplan(script, { registry })` 로 원하는 모듈 세트를 즉시 주입할 수 있습니다.  
- 기본적으로 `new ModuleRegistry()` 는 기본 모듈(basicModules)을 자동 등록합니다. 완전히 비어 있는 레지스트리가 필요하면 `new ModuleRegistry({ seedBasicModules: false })` 를 사용하거나, `seedModules` 옵션으로 초기 모듈 집합을 지정할 수 있습니다.
- `listRegisteredModules()` API로 UI/프롬프트에서 활용할 전체 메타데이터를 추출할 수 있습니다.

### 8.3 Step System

- Step / Sub-step 구조로 복잡한 플로우를 나눌 수 있습니다.  
- Error Policy(retry, continue, jump)를 통해 실패 상황을 제어합니다.  
- Step Events(onStepStart/onStepEnd/onStepError 등) 로 UI/로그를 연동할 수 있습니다.

### 8.4 ExecutionContext

- 실행 중 생성된 변수들이 저장되는 컨텍스트입니다.  
- 각 Action/Step의 결과가 ctx에 저장되고, 이후 Step에서 재사용할 수 있습니다.
- `ctx.getEnv()`, `ctx.getMetadata()` 로 runQplan 옵션에 전달한 사용자/세션 정보를 모듈에서 활용할 수 있습니다.
- ctx 변수는 `stats.total` 처럼 점(.) 표기(dot-path)로 하위 필드를 읽을 수 있으므로, Step 결과나 JSON 객체를 그대로 저장해 두고 필요한 속성만 꺼내 쓸 수 있습니다.

### 8.5 Flow Control

- 조건: `if`  
- 반복: `while`, `each`  
- 병렬: `parallel`  
- 비동기: `future`, `join`  
- 제어: `stop`, `skip`, `jump`

---

## 9. API Overview

### 9.1 `runQplan(script, options)`

QPlan 스크립트를 실행하는 메인 함수입니다.

- `script`: QPlan 코드 문자열  
- `options.registry`: 사용할 ModuleRegistry (기본값은 내장 registry)
- `options.env / options.metadata`: 실행 컨텍스트 정보. `ctx.getEnv()`, `ctx.getMetadata()` 로 액션 모듈에서 접근 가능
- `options.stepEvents`: Plan/Step 이벤트 핸들러 (onPlanStart/End + onStepStart/End/Error/Retry/Jump)
- `options.runId`: 기본값은 자동 생성. 자체 추적 ID를 써야 하면 지정 가능

반환값: `ExecutionContext` (ctx)

---

### 9.2 `buildAIPlanPrompt(requirement: string, options?)`

사용자 요구사항을 입력하면,  
AI가 QPlan 실행 계획을 생성할 수 있도록 돕는 프롬프트 문자열을 반환합니다.

- `options.registry`: 사용할 ModuleRegistry (기본값은 내장 registry)
- `options.language`: 프롬프트에서 사용할 문자열 언어(미지정 시 `setUserLanguage()` 로 설정한 값)

포함 내용:

- Language 요약(grammar summary)  
- 사용 가능한 모듈 목록(`registry.list()` 기반)  
- Step 설계 가이드 및 예시

---

### 9.3 `registry: ModuleRegistry`

ModuleRegistry는 ActionModule 메타데이터를 보관하고, AI 및 실행기에 전달하는 허브 역할을 합니다.

- `register(module)` : 단일 모듈 등록
- `registerAll([m1, m2])` : 여러 모듈을 한 번에 등록
- `list()` : 등록된 모듈 목록을 AI-friendly 형태로 반환
- `listRegisteredModules(registry?)` 유틸을 통해 현재 registry의 메타데이터를 UI/프롬프트에 재사용할 수 있음

```ts
registry.register(searchModule);
registry.registerAll([filterModule, askUserModule]);

const modulesForAI = registry.list(); // buildAIPlanPrompt 등에 전달
```

모듈 설명이 잘 정리되어 있어야 AI가 QPlan 계획을 만들 때 올바르게 조합할 수 있으므로,
module id/description/inputs 등을 명확히 작성한 뒤 registry에 등록하는 것이 중요합니다.

---

### 9.4 `validateQplanScript(script: string)`

QPlan 스크립트를 실행하기 전에 **문법·시맨틱 검증만** 하고 싶을 때 사용합니다.

- 정상일 경우: `{ ok: true, ast }` 반환
- 오류일 경우: `{ ok: false, error, line?, issues? }`

```ts
const validation = validateQplanScript(aiScript);
if (!validation.ok) {
  console.error("계획 검증 실패:", validation.error, validation.line);
  return;
}
await runQplan(aiScript, { registry });
```

토큰화/파싱/간단한 시맨틱 검사(예: 선언되지 않은 변수 사용 등) 결과만 알려주므로,
안전하게 실행 가능한지 사전 확인할 때 유용합니다.

---

## 10. Grammar Spec (요약)

- **Action**:  
  `moduleName key1=value1 key2=value2 -> outVar`

- **Step**:  
  `step id="stepId" desc="설명" { ... }`

- **조건 / 반복**:  
  `if`, `while`, `each`

- **병렬 / 비동기**:  
  `parallel`, `future`, `join`

- **제어**:  
  `stop`, `skip`, `jump`, `onError` 정책
- **컨텍스트 접근**:  
  ctx 변수 및 Step 결과는 `stats.total`, `order.detail.status` 처럼 점(dot) 표기로 하위 필드를 직접 참조할 수 있음

자세한 문법은 별도의 grammar 문서를 참고할 수 있습니다.

---

## 11. License

MIT

---

## 12. Contribute

Issue 및 PR는 언제든지 환영합니다.  
QPlan을 활용한 사례, 추가 모듈, 개선 제안 등을 공유해 주세요.

## 13. Browser 번들
Vite/Rollup/Webpack 등 번들러는 `package.json` 의 `"browser"` 필드를 따라가므로, 브라우저 환경에서는 자동으로 `dist/modules/basic/file.browser.js` (Node 전용 `fs/promises`, `path` 의존성이 없는 스텁)으로 대체된다. 서버/CLI에서는 기존 `file` 모듈이 그대로 제공된다.
