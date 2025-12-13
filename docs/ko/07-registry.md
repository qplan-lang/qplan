# 07-registry.md

## 1. ModuleRegistry 개요
`ModuleRegistry` 는 QPlan이 실행할 수 있는 모든 ActionModule 을 중앙에서 관리한다. `src/core/moduleRegistry.ts` 에 구현되어 있으며 다음 기능을 제공한다.

| 메서드 | 설명 |
| --- | --- |
| `register(module)` | 단일 모듈 등록. `module.id` 가 없으면 경고만 출력하고 무시한다. |
| `registerAll(modules)` | 여러 모듈을 순서대로 등록. 내부적으로 `register()` 를 호출한다. |
| `get(id)` | 실행 시 Executor가 모듈을 조회할 때 사용. 없으면 `undefined`. |
| `list()` | AI 프롬프트/문서화를 위한 메타데이터 배열을 반환. `{ id, description, usage, inputs }` 구조. |

기본적으로 `src/index.ts` 에서 `export const registry = new ModuleRegistry();` 로 생성한 뒤 `registry.registerAll(basicModules)` 를 호출해 기본 모듈을 등록한다.

## 2. 등록 예시
```ts
import { registry } from "qplan";
import { httpModule } from "qplan/dist/modules/basic/http.js";

registry.register(httpModule);
registry.registerAll([htmlModule, aiModule]);
```

- 한 모듈은 오직 한 번만 등록할 수 있다. 이미 등록된 id를 다시 등록하려 하면 오류가 발생한다.
- id가 없는 모듈을 등록하면 경고(`AI cannot refer to this module`)가 출력되고 registry에는 포함되지 않는다. 실행 목적이라도 id를 부여하는 것이 안전하다.

## 3. 메타데이터와 AI 프롬프트
`registry.list()` 는 현재 등록된 모듈 정보를 반환하며 `buildAIPlanPrompt()` / `buildQplanSuperPrompt()` 가 이 데이터를 사용해 LLM에게 모듈 사용법을 전달한다.

```ts
const modules = registry.list();
/*
[
  { id: "file", description: "파일 읽기/쓰기", usage: "file read path=...", inputs: ["op","path","data"] },
  ...
]
*/
```

메타데이터를 잘 작성할수록 AI가 올바른 QPlan 명령을 생성할 확률이 높아진다. 특히 `description` 과 `usage` 는 Prompt Builder가 그대로 프롬프트에 삽입한다.

## 4. 실행 시 ModuleRegistry 활용 흐름
1. `runQplan(script)` 를 호출하면 Parser가 AST를 만든 뒤 Executor가 Step을 실행한다.
2. Action을 만날 때마다 Executor는 `registry.get(moduleId)` 로 모듈을 찾는다.
3. 모듈이 없으면 즉시 오류를 던져 Step onError 정책에 따라 처리된다.
4. 모듈이 반환한 결과는 ExecutionContext에 저장되고, 이후 Action에서 동일 변수명을 참조하면 ctx 값을 자동으로 사용한다.

## 5. 레지스트리 확장 가이드
- **커스텀 모듈 추가**: ActionModule을 작성한 뒤 `registry.register(customModule)` 을 호출한다.
- **테스트 / 샌드박스용 모듈**: 임시 모듈을 넣을 때도 id를 부여해 두면 AI/문서화에 노출시킬 수 있다. id가 없으면 registry에 등록되지 않는다.
- **모듈 해제**: 현재 Registry는 제거 기능을 제공하지 않는다. 필요하면 새로운 ModuleRegistry 인스턴스를 생성해 원하는 모듈만 등록한 뒤 `runQplan(script, { registry: customRegistry })` 패턴을 구현할 수 있다 (커스텀 엔트리 포인트 필요).
- **metadata 업데이트**: Module 객체의 `description/usage/inputs` 를 수정하면 `registry.list()` 반환값에도 즉시 반영된다.

## 6. 모듈 관리 베스트 프랙티스
- 모듈 id는 소문자/간결한 이름을 권장한다 (`search`, `payment`).
- `inputs` 배열에 실제 사용하는 키를 모두 적어 AI가 잘못된 키를 쓰지 않도록 한다.
- `usage` 예시는 실제 QPlan 코드를 그대로 적어 두면 Prompt Builder가 유용한 힌트를 제공할 수 있다.
- registry 상태를 로그로 확인하고 싶다면 `console.log(registry.list())` 를 활용한다.

이 문서를 통해 ModuleRegistry가 QPlan 모듈 생태계의 관문이며, LLM 통합/실행 시 어떤 방식으로 사용되는지 이해할 수 있다.
