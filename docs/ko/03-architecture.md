# 03-architecture.md

## 1. 시스템 전반 개요
QPlan은 **"LLM이 작성 → 엔진이 실행"**이라는 시나리오를 위해 설계된 Step 기반 워크플로우 엔진이다. 사용자가 작성한 QPlan 스크립트는 Tokenizer → Parser → Semantic Validator → Step Resolver → Executor 파이프라인을 거쳐 실행되고, 모든 중간 값은 ExecutionContext(ctx)에 저장된다. 아래 구성요소는 모두 `src/` 디렉터리에 구현되어 있으며, 외부에서는 `runQplan`, `registry`, `buildAIPlanPrompt` 등을 통해 접근한다.

```
Script
  ↓ tokenize()              (src/core/tokenizer.ts)
Tokens
  ↓ Parser.parse()          (src/core/parser.ts)
ASTRoot
  ↓ validateSemantics()     (src/core/semanticValidator.ts)
Validated AST + StepResolution
  ↓ Executor.run()          (src/core/executor.ts)
ExecutionContext (variables, futures, step outputs)
```

## 2. 핵심 컴포넌트
| 컴포넌트 | 설명 | 주요 파일 |
| --- | --- | --- |
| Tokenizer | 스크립트를 토큰 리스트로 분해. 문자열, 숫자, JSON, Identifier, 키워드 등을 구분한다. | `src/core/tokenizer.ts` |
| Parser | 토큰을 AST(Action, If, While, Each, Parallel, Step, Jump 등)로 변환한다. 모든 Action/제어문이 Step 내부에 있는지 검사하고, var/print 같은 특별 구문도 처리한다. | `src/core/parser.ts`, `src/core/ast.ts` |
| Semantic Validator | Step ID 중복, onError="jump" 대상 존재 여부, `jump to` 대상 존재 여부 등을 미리 검증해 Issues 배열을 돌려준다. | `src/core/semanticValidator.ts` |
| Step Resolver / Controller | Step 트리를 분석해 order/path/parent 관계를 계산하고, 실행 중에는 onError 정책(fail/continue/retry/jump)과 Plan/Step 이벤트(onPlanStart/End, onStepStart/End/Error/Retry/Jump)를 관리한다. | `src/step/stepResolver.ts`, `src/step/stepController.ts`, `src/step/stepEvents.ts` |
| Executor | AST를 순차/병렬로 실행한다. If/While/Each/Parallel/Jump/Set/Return/Future/Join/Stop/Skip을 모두 처리하며 ExecutionContext를 갱신한다. | `src/core/executor.ts` |
| ExecutionContext | ctx.set/get/has/toJSON 을 제공하는 런타임 저장소. dot-path(`stats.total`) 접근을 지원하고, 실행 옵션으로 전달한 `env`, `metadata` 는 `ctx.getEnv()`, `ctx.getMetadata()` 로 읽을 수 있다. | `src/core/executionContext.ts` |
| ModuleRegistry | ActionModule 등록/조회/메타데이터 노출 담당. `new ModuleRegistry()` 를 호출하면 기본 모듈이 자동 등록되며, `{ seedBasicModules: false }` 옵션으로 비활성화할 수 있다. | `src/core/moduleRegistry.ts`, `src/index.ts` |
| ActionModule | 함수형 또는 `{ execute(inputs, ctx) {} }` 객체형 모듈 규격. `id/description/usage/inputs` 메타데이터가 있으면 LLM/문서화에 활용된다. | `src/core/actionModule.ts` |
| Prompt Builders | `buildAIPlanPrompt`, `buildQplanSuperPrompt`, `buildAIGrammarSummary` 는 현재 registry에 등록된 모듈과 문법 요약을 묶어 LLM 프롬프트를 생성한다. | `src/core/buildAIPlanPrompt.ts`, `src/core/buildQplanSuperPrompt.ts`, `src/core/buildAIGrammarSummary.ts` |

## 3. Step 시스템 아키텍처
1. **Step 정의** – `step id="..." desc="..." type="..." onError="..." { ... }` 형태. Parser가 Step 헤더를 읽고 Step ID 유효성을 검사한 뒤 StepNode를 만든다.
2. **Step Resolution** – 실행 전 `resolveSteps()` 가 Step 트리를 순회해 `order`, `path`, `parent`, `errorPolicy` 메타데이터를 생성하고, Step ID → StepNode 매핑을 만든다.
3. **StepController** – Executor가 Step을 실행할 때 StepController가 다음 로직을 담당한다:
   - onStepStart/End/Error/Retry/Jump 이벤트 발생 (`stepEvents` 옵션으로 핸들러 전달 가능)
   - `onError="continue"` : 오류 발생 시 Step만 종료하고 다음 명령으로 이동
   - `onError="retry=N"` : 실패 시 최대 N회 재시도(각 시도마다 onStepRetry 이벤트 호출)
   - `onError="jump='cleanup'"` : JumpSignal을 발생시켜 지정한 Step으로 이동
4. **Jump 처리** – `jump to="stepId"` 문이나 onError jump 정책이 발생하면 StepController가 JumpSignal을 던지고, Executor는 block override 테이블을 업데이트해 루프/블록을 재시작한다.
5. **Step 결과** – Step 블록 내 `return` 이 있으면 해당 객체를, 없으면 마지막 Action 결과를 Step 결과로 삼는다. 어떤 경우든 실행 중 `ctx[runId][namespace]` 에 저장되며, namespace 기본값은 Step ID 이고 `step ... -> resultVar` 로 오버라이드할 수 있다. namespace 를 바꿔도 동일 객체가 Step ID 아래에도 복제되므로 이후 Step에서는 `namespace.field` 와 `stepId.field` 를 모두 사용할 수 있다.

## 4. 모듈 구조
- **기본 번들** – `src/modules/index.ts` 에서 `var/print/echo/sleep/file/math/future/join/json` 9개 모듈을 기본 registry에 등록한다.
- **확장 모듈** – `src/modules/basic/*.ts` 폴더에는 http, html, string, ai, timeout 등 추가 모듈 구현이 포함되어 있으며 필요 시 `registry.register()` 로 활성화한다.
- **ActionModule 실행 규칙** – Executor가 모듈을 꺼내 `typeof mod === "function"` 인지 확인하고 곧바로 호출하거나 `mod.execute()` 를 호출한다. Future 모듈이 `{ __future: Promise }` 를 반환하면 ctx에는 해당 Promise만 저장하여 join이 활용할 수 있게 한다.

## 5. Prompt / AI 통합 구성
1. **buildAIPlanPrompt(requirement, { registry, language })** – 선택한 registry의 모듈 메타데이터 + AI-friendly grammar summary + 실행 규칙 + 사용자 요구사항을 묶어 LLM에게 “QPlan 스크립트만 출력하라”고 지시하는 프롬프트를 생성한다.
2. **buildQplanSuperPrompt(registry)** – LLM 시스템 프롬프트 버전으로 QPlan 철학/엔진 구조/모듈 목록/grammar 요약을 제공한다.
3. **buildAIGrammarSummary()** – `docs/02-grammar.md` 전체를 대신할 경량 문법 요약을 생성해 LLM 입력 길이를 줄인다.

## 6. ExecutionContext & 데이터 흐름
- **저장** – Action 결과 또는 Step 결과를 `ctx.set(name, value)` 로 저장.
- **조회** – 다른 Action이 문자열 인수를 전달하면 ctx에 동일 이름이 있는지 확인 후 자동 바인딩한다. `ctx.has/ctx.get` 는 dot-path를 지원하므로 Step에서 `return stats={ total, count }` 를 해두면 `stats.total` 로 재사용 가능.
- **Dump** – `ctx.toJSON()` 으로 전체 상태를 로깅/디버깅할 수 있다.

## 7. Tooling & Validation
- **validateQplanScript(script)** – Tokenize + Parse + Semantic Validation 결과를 반환. 문제 없으면 `{ ok: true, ast }`, 에러 시 `{ ok: false, error, line, issues? }` 구조다.
- **CLI** – `npm run validate -- <file>` (`src/tools/validateScript.ts`) 로 파일 또는 stdin을 검사해 CI/에디터 통합에 활용한다.
- **Step Events** – `runQplan(script, { env, metadata, stepEvents })` 로 플랜 시작/종료 및 Step 진행 상황을 관찰하고 UI/로그/모니터링 시스템에 반영한다. 이벤트마다 `StepEventRunContext` 가 함께 전달된다.

## 8. 확장 & 통합 포인트
1. **모듈 추가** – ActionModule 작성 후 `registry.register(customModule)` 호출. 메타데이터를 채우면 Prompt Builder가 자동으로 사용법을 포함한다.
2. **커스텀 Executor hook** – `stepEvents` 로 플랜/Step 시작·종료·오류·재시도·점프 이벤트를 수신하고, 컨텍스트 정보(env/metadata)를 함께 받아 Gantt, 진행률, 감사 로그를 구현한다.
3. **LLM 통합** – `buildAIPlanPrompt` 호출 전에 `setUserLanguage("<언어 문자열>")` 로 언어를 지정하고, 프롬프트를 만든 뒤 `runQplan` 으로 실행하면 “AI thinks, QPlan executes” 패턴을 완성할 수 있다.
4. **Grammar/Docs** – `docs/02-grammar.md`, `docs/06-executor.md`, `docs/10-step-system.md` 등 세부 문서를 참고해 기능별로 확장 전략을 수립한다.

## 9. 요약 다이어그램
```
+---------------------+
|  QPlan Script       |
+---------------------+
          |
          v tokenize()
+---------------------+
| Tokenizer           |
+---------------------+
          |
          v Parser.parse()
+---------------------+
| AST (Action/Step/...)|
+---------------------+
          |
          v resolveSteps() + validateSemantics()
+---------------------+
| StepResolution      |
+---------------------+
          |
          v Executor.run()
+---------------------+
| StepController +    |
| ExecutionContext    |
+---------------------+
          |
          v
+---------------------+
| ctx variables /     |
| step events / logs  |
+---------------------+
```

위 구조를 통해 QPlan은 간결한 문법, Step 기반 제어, 모듈 확장성을 동시에 제공하며 AI/사람이 공동으로 워크플로우를 설계하고 실행할 수 있는 환경을 마련한다.
