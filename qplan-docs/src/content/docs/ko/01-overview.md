# 01-overview.md
**QPlan Language — AI Planning Language & Execution Engine**

## 🚀 QPlan이란?
QPlan은 **AI가 설계하고 사람이 검증할 수 있는 Step 기반 워크플로우 언어/엔진**이다. LLM이 자연어 요구사항을 QPlan 스크립트로 작성하고, 엔진이 해당 스크립트를 안전하게 실행해 실제 작업(파일 처리, 데이터 가공, 외부 호출 등)을 수행한다.

핵심 목표:
- **Simple**: 한 줄 명령이라도 즉시 실행 가능하고 문법은 docs/02-grammar.md 한 장으로 끝난다.
- **Composable**: Step/Sub-step, jump, onError로 복잡한 플로우를 구조화한다.
- **AI-Friendly**: registry 메타데이터 + AI 친화적 문법 요약을 제공해 모델이 스크립트를 자동 생성한다.
- **Extensible**: ActionModule 만 작성하면 registry에 즉시 플러그인된다.
- **Deterministic & Observable**: Step order/path/event 로깅을 통해 언제든 재현/모니터링이 쉽다.
- **Future-proof**: Future/Parallel/Join, dot-path 변수 참조 등 현대적 제어 흐름을 기본 지원한다.

이 목표들의 배경 설명은 [`docs/ko/qplan-why.md`](docs/ko/qplan-why.md) 를 참고해 주세요.

> **AI thinks, QPlan executes.**

## 🧩 엔진 구성요소
1. **Tokenizer & Parser** — `src/core/tokenizer.ts`, `parser.ts` 구성. 스크립트를 토큰화 후 AST(Action/If/Parallel/Each/Step/JUMP 등)로 변환한다. Parser가 Step 내부 여부를 엄격히 검사하므로 Action/제어문은 Step 밖에서 사용할 수 없다.
2. **Semantic Validator & Step Resolver** — `semanticValidator.ts` 는 jump/onError 대상 Step을 검증하고 경고 리스트를 반환한다. `stepResolver.ts` 는 Step 트리를 분석해 order/path/parent 관계를 만든다.
3. **Executor & StepController** — `executor.ts` 는 AST를 순차/병렬 실행하고, Future/Join/Parallel/Each/While/Jump/Return/Set 을 모두 다룬다. `stepController.ts` 는 Step의 onError(fail/continue/retry/jump) 정책, retry 루프, Step 이벤트 방출을 담당한다.
4. **ExecutionContext(ctx)** — `executionContext.ts` 는 `set/get/has/toJSON` 을 제공하는 런타임 저장소다. `stats.total` 처럼 dot-path 접근을 지원하며, 실행 옵션으로 전달한 `env`, `metadata` 를 `ctx.getEnv()`, `ctx.getMetadata()` 로 읽어 모듈에서 사용자/세션 정보를 활용할 수 있다.
5. **ModuleRegistry & ActionModule** — `moduleRegistry.ts` 는 모듈 등록/조회/메타데이터 추출을 관리한다. ActionModule 은 함수형이나 `execute()` 메서드를 가진 객체형 모두 지원하며 `id/description/usage/inputs` 메타데이터를 포함할 수 있다. `src/index.ts` 에서 `registry` 를 export 하며 `basicModules` 를 자동 등록한다.
6. **Prompt Builders** — `buildAIPlanPrompt`, `buildQplanSuperPrompt`, `buildAIGrammarSummary` 가 registry에 등록된 모듈과 문법 요약을 묶어 LLM에 전달할 시스템/사용자 프롬프트를 동적으로 만들어 준다.

## 🪜 Step System & 실행 규칙
- **Action은 항상 Step 내부**에서만 실행된다. 최상위 루트에는 Step 블록만 존재하며, Step 안에서 Action/If/While/Each/Parallel/Jump 등을 사용할 수 있다.
- `step id="..." desc="..." type="..." onError="..." { ... }` 형태를 갖는다. `type` 필드는 UI 태깅, `onError` 는 fail(기본)/continue/retry=N/jump="stepId" 를 지원하며 Step 결과는 항상 Step ID에 저장된다.
- Step 내부에서 `return key=value ...` 를 사용하면 Step 결과를 명시적으로 구성하고, 없으면 마지막 Action 결과가 Step 결과가 된다.
- `jump to="stepId"` 문으로 Step 간 이동이 가능하다. Jump 대상은 Step ID여야 하며, semantic validator가 존재 여부를 검사한다.
- Step 은 중첩(Sub-step) 가능하며, Step 트리는 `order`(실행 순번)와 `path`(예: `1.2.3`)가 자동 부여된다.
- `runQplan(script, { registry, env, metadata, stepEvents })` 형태로 registry 주입 및 실행 컨텍스트를 전달하고, Step/Plan 이벤트를 관찰할 수 있다.

```ts
import { runQplan, registry } from "qplan";

await runQplan(script, {
  registry,
  env: { userId: "u-123" },
  metadata: { sessionId: "s-456" },
  stepEvents: {
    onPlanStart(plan) { console.log("플랜 시작", plan.runId, plan.totalSteps); },
    onStepStart(info, context) { console.log("▶", info.order, info.stepId, context?.env); },
    onStepEnd(info, result) { console.log("✓", info.stepId, result); },
    onStepError(info, err) { console.error("✗", info.stepId, err.message); },
    onPlanEnd(plan) { console.log("플랜 종료", plan.runId); }
  }
});
```

## 🔄 제어 흐름 & 언어 기능
- **If / While** — 조건식은 `> < >= <= == != EXISTS NOT_EXISTS` 와 `AND/OR/not` 및 괄호를 지원한다. While 은 동일한 조건 구문을 반복에 사용한다.
- **Each** — `each item in iterable { ... }` 또는 `each (item, idx) in iterable { ... }` 로 배열을 순회한다. 내부에서 `break`/`continue` 사용 가능.
- **Parallel** — `parallel concurrency=3 ignoreErrors=true { ... }` 로 블록을 병렬 실행한다.
- **Future & Join** — `future` 모듈은 Promise를 `__future` 래퍼에 담아 ctx에 저장하고, `join futures="f1,f2" -> list` 가 여러 Future를 합친다.
- **Set & Return** — `set total = (total + delta) * 0.5` 처럼 산술 표현식을 기존 변수에 적용하고, `return key=value ...` 로 Step 출력 객체를 직접 구성한다.
- **Break / Continue** — Each, While 루프 안에서 루프 탈출/다음 반복으로 이동.
- **Stop / Skip** — Plan 전체 중단 또는 현재 Step 건너뛰기.
- **ExecutionContext** — `ctx.get("order.summary.status")` 처럼 dot-path로 하위 값을 읽을 수 있고, `ctx.getEnv()`, `ctx.getMetadata()` 로 실행 시 전달한 컨텍스트에 접근할 수 있으며, `ctx.toJSON()` 으로 전체 상태를 덤프할 수 있다.
- **문법 전체**는 `docs/02-grammar.md` 를 참고하면 된다. `buildAIGrammarSummary()` 는 해당 문법을 LLM용으로 요약한 버전을 자동 생성한다.

## 📦 기본 제공 모듈 (basicModules)
기본 registry에는 다음 9개 모듈이 자동 등록된다(`src/modules/index.ts`).
- **var** — 문자열/숫자/JSON 리터럴을 그대로 ctx 변수에 저장한다. 기존 변수를 복사하려면 `set` 을 사용해야 한다.
- **print** — `console.log` 스타일 출력. 문자열/숫자/ctx 변수를 혼합해 찍고 마지막 출력 값을 반환한다.
- **echo** — 입력 인수를 그대로 객체로 반환하는 디버깅 모듈.
- **sleep** — 지정한 ms 동안 대기 후 `"slept Xms"` 를 반환한다.
- **file** — `op=read/write` 로 파일을 읽거나 저장한다. write 시 객체 입력은 JSON으로 직렬화한다.
- **math** — `add/sub/mul/div/sum/avg` 를 제공한다. `arr` 는 JSON 배열 또는 공백/콤마 분리 문자열을 모두 허용한다.
- **future** — 비동기 Future를 생성해 ctx에 Promise를 저장한다(`{ __future: Promise }` 형태).
- **join** — `futures="a,b,c"` 로 등록된 Future 이름 배열을 `Promise.all` 한 결과를 반환한다.
- **json** — `parse/stringify/get/set/keys/values/entries` 로 JSON을 다루고, 문자열 입력 시 자동 파싱을 시도한다.

## ➕ 확장 모듈 & Registry 활용
저장소에는 추가 모듈(`ai`, `http`, `html`, `string`, `timeout` 등)이 `src/modules/basic/*.ts` 로 포함되어 있다. 기본 번들에는 포함되지 않으므로 필요 시 직접 가져와 registry에 등록하면 된다.

```ts
import { registry } from "qplan";
import { httpModule } from "qplan/dist/modules/basic/http.js"; // 또는 src 경로에서 직접 import

registry.register(httpModule);
registry.registerAll([htmlModule, stringModule, aiModule]);
```

모듈은 함수 혹은 `{ execute(inputs, ctx) { ... } }` 형태의 객체로 작성할 수 있으며, `inputs` 메타데이터를 채우면 `buildAIPlanPrompt()` 가 자동으로 AI 프롬프트에 사용 방법을 삽입한다.

## 🤖 AI 통합 기능
- **buildAIPlanPrompt(requirement, { registry, language })** — 선택한 registry의 모듈 + 문법 요약 + 실행 규칙을 포함한 프롬프트를 생성해 LLM에게 “QPlan 코드만 작성하라”고 지시한다. onError, jump, dot-path 규칙 등이 모두 명시된다. `setUserLanguage("<언어>")` 또는 `language` 옵션으로 문자열 언어를 제어할 수 있다.
- **buildQplanSuperPrompt(registry)** — LLM 시스템 프롬프트 버전. QPlan 철학, 엔진 구조, Grammar 요약, 모듈 메타데이터가 포함된 “최상위 가이드”를 만들어 준다.
- **buildAIGrammarSummary()** — 긴 grammar 문서를 AI 친화 문장으로 압축한다.

```ts
import { buildAIPlanPrompt, registry, setUserLanguage } from "qplan";

registry.register(customModule);
setUserLanguage("ko"); // 임의의 언어 문자열 사용 가능
const prompt = buildAIPlanPrompt("재고 집계 보고서를 만들어줘", { registry });
const aiScript = await callLlm(prompt);
```

이렇게 생성된 스크립트는 `runQplan` 으로 즉시 실행하거나 `validateQplanScript` 로 사전 검증할 수 있다.

## ✅ 검증 & 실행 도구
- **validateQplanScript(script)** — Tokenize, Parse, Semantic Validation 결과를 반환한다. 성공 시 `{ ok: true, ast }`, 실패 시 `{ ok: false, error, line, issues }` 구조다.
- **QPlan(script, { registry }?)** — 스크립트를 객체로 감싸 사전 검증(`qplan.validate()`), 스텝 목록(`qplan.getStepList()`), 실행(`qplan.run()`) 동안 상태(pending/running/retrying/completed/error)를 추적할 수 있는 래퍼. `examples/19_exam_qplan_object.js` 에서 UI + 실행 흐름 전체 예시를 제공한다.
- **주석 지원** — QPlan 스크립트 어디서나 `// 한 줄 주석`, `# 한 줄 주석`, `/* 블록 주석 */` 을 사용할 수 있으며, 토크나이저가 전부 무시한다.
- **CLI 검증기** — `src/tools/validateScript.ts` 를 통해 `npm run validate -- examples/12_exam_step.qplan` 처럼 파일 또는 stdin(`-`)을 검사할 수 있다.
- **Semantic Validator** — jump to 대상 Step 누락, onError="jump" 대상 검증 등 구조적 오류를 미리 탐지한다.
- **ExecutionContext 디버깅** — `ctx.toJSON()` 으로 현재 변수 상태를 전부 출력해 UI/로그에서 쉽게 확인할 수 있다.
- **Step Events** — UI/모니터링 시스템이 플랜 시작/종료 + Step 시작/종료/오류/재시도/점프 이벤트를 구독할 수 있으며, 각 이벤트는 `StepEventRunContext` 를 함께 받아 env/metadata 를 활용한 대시보드를 구성할 수 있다.

## 🧪 실행 예시
아래는 기본 모듈만으로 구성한 간단한 Step 기반 파이프라인이다.

```
step id="load" desc="데이터 로드" {
  file read path="./data/raw.json" -> rawTxt
  json parse data=rawTxt -> parsed
  return list=parsed
}

step id="aggregate" desc="누적/평균 계산" {
  var 0 -> total
  each value in load.list {
    set total = total + value
  }
  math avg arr=load.list -> average
  return total=total average=average
}

step id="report" desc="결과 출력" onError="continue" {
  print message="평균" value=aggregate.average
  echo summary="done" total=aggregate.total avg=aggregate.average -> final
  return result=final
}
```

## 📌 디자인 철학
1. **모듈 중심 확장성** — ActionModule 만 작성하면 실행계획/프롬프트/검증에 자동 반영된다.
2. **AI-First Grammar** — Step 강제, dot-path, Future/Parallel 등 AI가 오판하기 쉬운 규칙을 명시적으로 문서화하고 Prompt Builder가 반복해서 상기시킨다.
3. **관측 가능성** — Step tree, order, path, event hook, ctx dump 로 실행 과정을 완전히 추적할 수 있다.
4. **단순함 유지** — 최소한의 문법으로 다양한 제어 흐름을 표현하고, Action 구현은 모두 TypeScript 모듈에 맡긴다.
5. **결정론적 실행** — 같은 스크립트 + 같은 ctx + 같은 모듈이면 항상 동일한 결과를 반환하도록 설계되었다.

이 문서는 QPlan 프로젝트의 전체 윤곽을 소개하고, 보다 상세한 문법/EBNF 는 `docs/02-grammar.md`, 모듈/예시는 `examples/` 디렉터리를 참고하면 된다.
