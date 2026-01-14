# 04-modules.md

## 1. 모듈 시스템 개요
QPlan의 모든 기능은 **ActionModule** 을 통해 확장된다. ActionModule은 함수형 또는 `{ execute(inputs, ctx) { ... } }` 형태의 객체형 둘 다 허용되며, 다음 메타데이터를 가질 수 있다.

| 필드 | 설명 |
| --- | --- |
| `id` | QPlan 스크립트에서 사용할 모듈 이름. 반드시 고유해야 한다. |
| `description` | AI / 문서에 노출되는 설명. 모듈 목적을 간결하게 적는다. |
| `usage` | 사용 예시 문자열. Prompt Builder가 그대로 프롬프트에 포함한다. |
| `inputs` | 지원하는 입력 파라미터 이름 배열. |
| `execute(inputs, ctx)` | 비동기/동기 모두 가능. 결과를 반환하면 ctx에 저장된다. |

함수형 모듈의 경우 메타데이터를 속성으로 덧붙인다:
```ts
export const echoModule = Object.assign(
  (inputs) => inputs,
  {
    id: "echo",
    description: "입력 그대로 반환",
    usage: `echo msg="hello" -> out`,
    inputs: ["msg"],
  }
);
```

## 2. 기본 등록 모듈 (basicModules)
`src/modules/index.ts` 에서 기본 registry에 자동 등록되는 11개 모듈:

| 모듈 | 설명 |
| --- | --- |
| `var` | 리터럴(숫자/문자열/JSON)을 ctx 변수로 저장한다. 기존 변수 복사는 불가. |
| `print` | console.log 스타일 출력. 문자열/숫자/ctx 변수/키-값을 혼합 출력. |
| `echo` | 입력 객체를 그대로 반환해 디버깅에 사용. |
| `sleep` | ms 만큼 대기 후 메시지를 반환. |
| `file` | `op=read/write` 로 파일을 읽거나 저장. write 시 객체는 JSON으로 직렬화. |
| `math` | `add/sub/mul/div/sum/avg` 연산을 제공. 배열 입력은 JSON/문자열 모두 허용. |
| `future` | `{ __future: Promise }` 래퍼로 비동기 작업을 생성. |
| `join` | `futures="a,b,c"` 로 등록된 Future들을 `Promise.all` 로 결합. |
| `json` | parse/stringify/get/set/keys/values/entries 기능 지원. |
| `time` | 현재 시간을 다양한 포맷으로 반환(기본 `HH:mm:ss`). |
| `date` | 현재 날짜/시간을 다양한 포맷으로 반환(기본 `YYYY-MM-DD`). |

기본 모듈 등록은 `src/index.ts` 에서 자동 수행된다:
```ts
import { basicModules } from "./modules/index.js";
registry.registerAll(basicModules);
```

## 3. 추가 제공 모듈 (src/modules/basic)
저장소에는 기본 번들과 별도로 다음 모듈들이 포함되어 있다. 필요 시 `registry.register()` 로 활성화하면 Prompt Builder에도 자동 반영된다.

| 모듈 | 기능 하이라이트 |
| --- | --- |
| `http` | fetch 기반 GET/POST. `headers`/`body` JSON 문자열 지원. |
| `html` | HTML 문자열에서 body/tag/tags/text 추출. 간단한 regex 기반. |
| `string` | lower/upper/trim/replace/split/join/includes/length/substring 등 문자열 처리. |
| `ai` | OpenAI Chat Completions 호출. `prompt/context/model/temperature/system` 입력 지원. |
| `timeout` | 지정 시간(ms) 대기 후 value 반환. 음수/0 ms 는 오류. |

필요 시 커스텀 모듈도 같은 폴더 구조로 추가할 수 있다.

## 4. 모듈 등록 패턴
```ts
import { registry } from "qplan";
import { httpModule } from "qplan/dist/modules/basic/http.js";

registry.register(httpModule);              // 단일 등록
registry.registerAll([htmlModule, aiModule]); // 여러 모듈 일괄 등록
```

- `registry.register(module)` 은 id 중복을 검사한다. 중복이면 오류가 발생한다.
- id가 없는 모듈을 등록하려 하면 경고를 출력하며 registry에 추가하지 않는다(LLM이 사용할 수 없으므로 안전 장치).
- `registry.list()` 로 현재 등록된 모듈 메타데이터를 얻어 AI 프롬프트에 활용할 수 있다.

## 5. ActionModule 구현 가이드
1. **ctx 변수 접근** – 문자열 입력이 ctx 변수명과 일치하면 Executor가 자동으로 ctx 값을 대입해 준다. 필요 시 직접 `ctx.has/ctx.get` 을 호출해도 된다.
2. **비동기 처리** – `execute` 가 Promise를 반환하면 Executor가 await 한다. Future 모듈처럼 병렬 처리가 필요하면 `{ __future: Promise }` 객체를 반환해 ctx에 Promise만 저장할 수 있다.
3. **입출력 검증** – 필요한 파라미터가 없으면 명시적으로 오류를 던져 Step의 onError 정책이 동작하도록 한다.
4. **메타데이터** – `description/usage/inputs` 를 채우면 `buildAIPlanPrompt` 가 자연스럽게 사용법을 AI에게 전달한다.
5. **상태 저장** – ActionModule은 Stateless로 구현하는 것을 권장한다. 실행 간 공유 상태가 필요하면 외부 클래스를 주입하거나 ExecutionContext를 활용한다.
6. **실행 제어** – 긴 루프/대기 모듈은 `await ctx.checkControl()` 을 주기적으로 호출해 pause/abort 요청을 반영하고, 필요 시 `ctx.getExecutionState()` 로 상태를 확인한다.

## 6. 모듈 디버깅 & 테스트
- **Examples** – `examples/` 디렉터리에 있는 `.qplan` 스크립트를 실행해 특정 모듈 동작을 검증할 수 있다.
- **validateQplanScript** – 새 모듈을 도입할 때 QPlan 문법 검사로 기본 안전성을 확보한다.
- **Step Events** – 모듈 내부 로그만으로 부족하다면 Step 이벤트 훅을 활용해 모듈 실행 구간을 추적한다.

## 7. 모듈 베스트 프랙티스 요약
- id는 짧고 명확하게. (예: `search`, `payment`)
- inputs 배열에 가능한 모든 파라미터 이름을 등록해 AI가 잘못된 키를 쓰지 않도록 한다.
- usage 예시는 실제 사용 형태를 그대로 보여준다.
- 모듈 간 책임 분리는 명확히: 파일 I/O, 수학, 문자열, HTTP 등 도메인별로 쪼갠다.
- 필요 시 모듈 내부에서 ctx 값을 읽을 때 dot-path 도 지원되는지 확인한다(ExecutionContext가 처리).

이 문서를 참조하면 QPlan 모듈 시스템을 빠르게 이해하고 커스텀 모듈을 작성/등록할 수 있다.
