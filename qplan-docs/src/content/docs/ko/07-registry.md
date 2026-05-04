# 07-registry.md

## 1. ModuleRegistry 개요
`ModuleRegistry` 는 QPlan이 실행할 수 있는 모든 ActionModule 을 중앙에서 관리한다. `src/core/moduleRegistry.ts` 에 구현되어 있으며 다음 기능을 제공한다.

| 메서드 | 설명 |
| --- | --- |
| `register(module)` | 단일 모듈 등록. `module.id` 가 없으면 경고만 출력하고 무시한다. |
| `registerAll(modules)` | 여러 모듈을 순서대로 등록. 내부적으로 `register()` 를 호출한다. |
| `get(id)` | 실행 시 Executor가 모듈을 조회할 때 사용. 없으면 `undefined`. |
| `list()` | AI 프롬프트/문서화를 위한 메타데이터 배열을 반환. `{ id, description, usage, inputs, inputType, outputType }` 구조. |

`new ModuleRegistry()` 를 호출하면 기본 모듈(basicModules)이 자동으로 등록되므로, 커스텀 인스턴스를 만들어도 동일한 기본 기능을 바로 사용할 수 있다. 완전히 비어 있는 registry가 필요하면 `new ModuleRegistry({ seedBasicModules: false })` 를 사용하거나, `seedModules` 옵션에 초기 모듈 배열을 전달하면 된다.

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
`registry.list()` 는 현재 등록된 모듈 정보를 반환하며 `buildAIPlanPrompt(requirement, { registry })`, `buildQplanSuperPrompt(customRegistry)`, `listRegisteredModules(registry)` 등이 그대로 활용해 LLM에게 모듈 사용법을 전달한다. 모듈 id는 유니코드 문자/숫자/밑줄 조합을 사용할 수 있지만(예: `foo`, `foo_bar`, `분석작업`), 첫 글자는 문자 또는 `_` 여야 하며 규칙을 위반하면 `registry.register()` 가 오류를 던진다.

```ts
const modules = registry.list();
/*
[
  { id: "file", description: "파일 읽기/쓰기", usage: "file read path=...", inputs: ["op","path","data"], inputType: { ... }, outputType: { ... } },
  ...
]
*/
```

메타데이터를 잘 작성할수록 AI가 올바른 QPlan 명령을 생성할 확률이 높아진다. 특히 `description` 과 `usage` 는 Prompt Builder가 그대로 프롬프트에 삽입한다. `inputType`/`outputType` 을 추가하면 모듈 입출력 구조까지 LLM에 전달할 수 있다.

## 4. 모듈 검색과 프롬프트 필터링
모듈이 많아지면 모든 모듈 정보를 LLM 프롬프트에 넣지 말고, 먼저 `category`, `tags`, `query`, `limit` 으로 후보를 줄인 뒤 계획 프롬프트를 만든다. 등록된 모듈은 실행용 registry에 그대로 남아 있고, 프롬프트에는 필터를 통과한 모듈만 노출된다.

모듈 메타데이터에는 검색을 위해 다음 필드를 추가할 수 있다.

```ts
registry.register({
  id: "http_get",
  title: "HTTP request",
  category: "network",
  tags: ["http", "api", "fetch"],
  aliases: ["request", "download"],
  description: "Fetch text from an API",
  usage: `http_get url="https://example.com" -> out`,
  inputs: ["url"],
  execute: async ({ url }) => fetch(String(url)).then(r => r.text()),
});
```

`registry.search()` 는 기본적으로 `excludeInPrompt: true` 모듈을 제외한다.

```ts
const modules = registry.search({
  categories: ["network", "data"],
  tags: ["json", "http"],
  query: "api parse",
  limit: 10,
});
```

검색 조건은 다음처럼 동작한다.

| 옵션 | 동작 |
| --- | --- |
| `category` | 단일 카테고리 필터 |
| `categories` | 여러 카테고리 중 하나라도 맞으면 통과 |
| `tags` | 기본값은 태그 중 하나라도 맞으면 통과 |
| `requireAllTags` | `true` 이면 `tags` 를 모두 가진 모듈만 통과 |
| `query` | `id`, `title`, `aliases`, `category`, `tags`, `description`, `inputs`, `usage`, 타입 정보에서 텍스트 검색 후 점수순 정렬 |
| `ids` | 지정한 모듈 id만 선택 |
| `limit` | 반환할 최대 모듈 수 |
| `includeExcluded` | `true` 이면 `excludeInPrompt` 모듈도 포함 |

계획 프롬프트를 만들 때는 `moduleFilter` 를 넘기면 된다.

```ts
const prompt = buildAIPlanPrompt("API에서 데이터를 가져와 JSON으로 파싱해줘", {
  registry,
  moduleFilter: {
    categories: ["network", "data"],
    tags: ["json", "http"],
    query: "api parse",
    limit: 8,
  },
});
```

기본 모듈 출력 상세도는 `compact` 이다. `compact` 는 `usage`, `category`, `tags` 를 생략하고 `id/title`, `description`, `inputs`, `inputType`, `outputType` 중심으로 출력한다.

| `moduleDetail` | 프롬프트에 넣는 모듈 정보 |
| --- | --- |
| `ids` | `id`, `title` 만 출력 |
| `compact` | 기본값. `id/title`, `description`, `inputs`, `inputType`, `outputType` |
| `usage` | `compact` + `usage` 예시 |
| `full` | `usage` + `category`, `tags`, `aliases` 까지 전체 출력 |

```ts
const prompt = buildAIPlanPrompt("파일을 읽어 평균을 계산해줘", {
  registry,
  moduleFilter: { categories: ["io", "math"], limit: 6 },
  moduleDetail: "compact",
});
```

특정 분야 모듈만 노출해야 하는 앱이라면 카테고리별 프롬프트를 따로 만들 수 있다.

```ts
const reportPrompt = buildAIPlanPrompt("매출 데이터를 요약해줘", {
  registry,
  moduleFilter: {
    category: "reporting",
    limit: 12,
  },
});
```

등록은 되어 있지만 동적 계획 생성에 노출하면 안 되는 모듈은 `excludeInPrompt: true` 를 사용한다.

```ts
registry.register({
  id: "internal_payment_admin",
  category: "payment",
  tags: ["admin", "internal"],
  excludeInPrompt: true,
  execute() {
    return "ok";
  },
});
```

카테고리 목록은 UI 필터나 RAG 후보 선택 화면에 사용할 수 있다.

```ts
const categories = registry.listCategories();
// [{ category: "data", count: 3 }, { category: "network", count: 5 }]
```

## 5. 실행 시 ModuleRegistry 활용 흐름
1. `runQplan(script, { registry })` 를 호출하면 Parser가 AST를 만든 뒤 Executor가 전달된 registry(없으면 기본 registry)로 Step을 실행한다.
2. Action을 만날 때마다 Executor는 `registry.get(moduleId)` 로 모듈을 찾는다.
3. 모듈이 없으면 즉시 오류를 던져 Step onError 정책에 따라 처리된다.
4. 모듈이 반환한 결과는 ExecutionContext에 저장되고, 이후 Action에서 동일 변수명을 참조하면 ctx 값을 자동으로 사용한다.

## 6. 레지스트리 확장 가이드
- **커스텀 모듈 추가**: ActionModule을 작성한 뒤 `registry.register(customModule)` 을 호출한다.
- **테스트 / 샌드박스용 모듈**: 임시 모듈을 넣을 때도 id를 부여해 두면 AI/문서화에 노출시킬 수 있다. id가 없으면 registry에 등록되지 않는다.
- **복수 registry 사용**: 새로운 `ModuleRegistry` 인스턴스를 만들면 기본 모듈이 자동 포함되며, 추가 모듈만 등록해서 `runQplan(script, { registry: customRegistry })`, `buildAIPlanPrompt(requirement, { registry: customRegistry })` 에 넘기면 된다. 완전히 빈 registry가 필요하면 `new ModuleRegistry({ seedBasicModules: false })` 를 사용한다.
- **metadata 업데이트**: Module 객체의 `description/usage/inputs/inputType/outputType` 를 수정하면 `registry.list()` 반환값에도 즉시 반영된다.

## 7. 모듈 관리 베스트 프랙티스
- 모듈 id는 소문자/간결한 이름을 권장한다 (`search`, `payment`).
- `inputs` 배열에 실제 사용하는 키를 모두 적어 AI가 잘못된 키를 쓰지 않도록 한다.
- `usage` 예시는 실제 QPlan 코드를 그대로 적어 두면 Prompt Builder가 유용한 힌트를 제공할 수 있다.
- registry 상태를 로그로 확인하고 싶다면 `console.log(registry.list())` 를 활용한다.

이 문서를 통해 ModuleRegistry가 QPlan 모듈 생태계의 관문이며, 이제는 런타임에서 registry 주입을 공식 지원해 LLM 통합/실행 양쪽에서 더 쉽게 재사용할 수 있음을 이해할 수 있다.
