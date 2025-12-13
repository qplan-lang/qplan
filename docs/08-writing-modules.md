# 08-writing-modules.md

QPlan의 기능은 ActionModule 을 작성해 확장할 수 있다. 이 문서는 함수형/객체형 모듈 작성법, 메타데이터 규칙, ctx/비동기 처리, 디버깅 팁을 정리한다.

## 1. ActionModule 형태
| 형태 | 설명 | 예시 |
| --- | --- | --- |
| 함수형 | 함수를 그대로 export 하고 `Object.assign()` 으로 메타데이터를 부여한다. | `echoModule`, `sleepModule`, `mathModule` |
| 객체형 | `{ execute(inputs, ctx) { ... } }` 형태로 작성한다. | `fileModule`, `httpModule`, `aiModule` |

```ts
// 함수형 예시
export const echoModule = Object.assign(
  (inputs: Record<string, any>) => inputs,
  {
    id: "echo",
    description: "입력 그대로 반환",
    usage: `echo msg="hello" -> out`,
    inputs: ["msg"],
  }
);

// 객체형 예시
export const fileModule = {
  id: "file",
  description: "파일 읽기/쓰기",
  usage: `file read path="./a.txt" -> txt`,
  inputs: ["op", "path", "data"],
  async execute(inputs, ctx) {
    ...
  }
};
```

## 2. 메타데이터 작성 규칙
- `id` (필수): QPlan 명령에서 사용할 이름. 고유해야 함.
- `description`: 모듈 기능을 간결하게 설명. Prompt Builder가 그대로 표시한다.
- `usage`: 실제 QPlan 사용 예시 문자열. 여러 줄 가능.
- `inputs`: 지원하는 파라미터 이름 배열. AI가 올바른 키를 사용하도록 돕는다.

메타데이터는 함수형과 객체형 모두 동일하게 적용되며, registry.list() 결과에 그대로 노출된다.

## 3. Inputs 처리 & ctx 연동
- 문자열 인수가 ctx에 존재하면 Executor가 자동으로 값을 대입한다. 모듈 내부에서 `ctx.has/ctx.get` 을 호출할 수도 있다.
- JSON 문자열을 직접 파싱해야 할 때는 모듈 내부에서 `JSON.parse` 를 수행한다 (예: `json`, `http` 모듈).
- 필요 파라미터가 없거나 형식이 잘못되면 `throw new Error(...)` 로 명확히 오류를 던져 Step onError 정책이 작동하도록 한다.

## 4. 비동기 작업과 Future
- 일반 async 함수는 Promise를 반환하면 된다. Executor가 `await` 처리한다.
- 병렬 작업을 위해 Future/Join 패턴을 활용하려면 `{ __future: Promise }` 형태를 반환한다. 예: `future` 모듈은 `setTimeout` Promise 를 감싸 ctx에 저장한다.

```ts
export const futureModule = {
  id: "future",
  execute(inputs) {
    const p = new Promise(res => setTimeout(() => res(inputs.value), inputs.delay));
    return { __future: p };
  }
};
```

## 5. 파일 및 외부 의존
- Node.js API (fs, path 등)를 사용할 경우 async/await 패턴으로 작성한다.
- 네트워크(fetch) 사용 시 sandbox/권한 정책을 고려한다. (예: `httpModule` 은 fetch 를 사용함)

## 6. 모듈 등록과 테스트
1. 모듈 작성 후 `registry.register(customModule)` 또는 `registry.registerAll([...])` 로 등록.
2. `docs/05-examples.md` 방식으로 간단한 Step을 만들어 동작 확인.
3. `npm run validate -- -` 로 스크립트를 검사하거나 `runQplan` 을 직접 호출해 테스트한다.
4. 메타데이터에 id/description/usage/inputs 가 모두 채워졌는지 확인하여 AI 프롬프트에 반영되도록 한다.

## 7. 베스트 프랙티스
- Stateless: 가능한 한 모듈은 상태를 갖지 않도록 작성한다. 필요 시 외부 서비스/클래스를 주입한다.
- 오류 메시지: 사용자/AI가 이해하기 쉬운 메시지를 제공한다.
- Logging: `console.log`/`console.error` 를 적절히 활용하되, 과도한 출력은 피한다.
- Reuse: 반복되는 로직은 헬퍼 함수로 분리하거나 다른 모듈을 재사용한다.

이 가이드를 따르면 QPlan 모듈을 일관성 있게 작성하고, registry/AI 통합 흐름에도 자연스럽게 녹여 넣을 수 있다.
