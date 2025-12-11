# qplan  
**AI-Generated Workflow DSL & Execution Engine**

qplan은 **AI가 작성하고 시스템이 실행하는** 경량 워크플로우 DSL이다.  
데이터 수집, 분석, 자동화, 주식 시스템, RPA 등 다양한 도메인에서  
**플랜을 언어로 표현하고 실행**할 수 있도록 설계되었다.

---

## ✨ Features

- **AI-friendly DSL**  
  자연어 기반 AI가 작성하기 쉬운 최소 문법으로 구성.  

- **Deterministic Execution**  
  모든 명령은 AST로 파싱되어 안정적으로 실행.  

- **모듈 기반 확장성**  
  원하는 기능을 `Module` 형태로 등록하여 바로 사용 가능.  

- **조건/반복/병렬 처리 지원**  
  IF / ELSE / EACH / PARALLEL 블록으로 복잡한 흐름 표현.  

- **도메인 비종속**  
  주식 자동화뿐 아니라 데이터 파이프라인, 크롤링, DevOps 등 범용 사용 가능.

---

## 📦 Installation

```bash
npm install qplan
```

---

## 🧪 Quick Start

```ts
import { runQplan } from "qplan";

const script = `
FETCH price stock=005930 days=30 -> price
CALC ma20 price -> ma20
`;

const ctx = runQplan(script);
console.log(ctx.toJSON());
```

---

# 📂 프로젝트 구조

```
src/
 ├ core/                # Engine: Tokenizer, Parser, Executor, Context
 ├ modules/             # Built-in & Extended Modules
 └ index.ts             # runQplan entry
docs/
 ├ 01-overview.md
 ├ 02-grammar.md
 ├ 03-architecture.md
 ├ 04-modules.md
 ├ 05-examples.md
 ├ 06-executor.md
 ├ 07-registry.md
 ├ 08-writing-modules.md
 └ 09-ai-integration.md
```

---

# 🧠 ActionModule (핵심 개념)

모든 기능은 **ActionModule** 을 통해 확장됩니다.

각 모듈은 다음 메타데이터를 포함할 수 있습니다:

```
id: string
description?: string
usage?: string
inputs?: string[]
execute(inputs, ctx)
```

함수형 / 객체형 모두 지원합니다.

---

# 🔧 기본 제공 모듈 (Minimal Built-in Set)

| 모듈 | 설명 |
|------|------|
| print | console.log 형태 출력 |
| echo | 입력 그대로 반환 |
| sleep | 딜레이(ms) |
| file | 파일 읽기/쓰기 |
| math | add/sub/mul/div/sum/avg/ma |
| future | 비동기 Future 생성 |
| join | Future 결과 병합 |

---

# 🌱 확장 모듈 (Optional)

| 모듈 | 설명 |
|------|------|
| http | GET/POST HTTP 요청 |
| html | HTML 파싱(body/tag/tags/text) |
| json | JSON parse/stringify |
| string | 문자열 유틸 |
| ai | OpenAI 기반 LLM 호출 |

필요 시 다음처럼 등록합니다:

```
registry.registerAll([ httpModule, aiModule ])
```

---

# 📜 DSL 문법 (요약)

### Action
```
math op="add" a=1 b=2 -> x
file read path="./data.txt" -> txt
sleep ms=500          # 결과 저장 없음
```
모듈 이름 뒤에 option을 붙이면 자동으로 `op` 값으로 전달됩니다(내부적으로 `__options[0]`).

### If
```
if not total > 100 and count < 5 {
  echo msg="big" -> r
} else {
  echo msg="small" -> r
}
```
괄호 `()` 를 사용하면 복잡한 and/or 조합의 우선순위를 조정할 수 있습니다.

### Parallel
```
parallel concurrency=2 {
  echo msg="A" -> a
  echo msg="B" -> b
}
```

### Each
```
each (item, idx) in items {
  math add a=total b=item -> total
  if idx >= 5 {
    stop
  }
  if item == 0 {
    skip
  }
  echo msg=idx -> lastIndex
}
```

### Future / Join
```
future task="A" delay=200 -> f1
future task="B" delay=500 -> f2
join futures="f1,f2" -> out
```

---

# 🚀 실행 흐름

```
script  
 → Tokenizer  
 → Parser(AST)  
 → Executor  
 → ExecutionContext(ctx)
```

---

# 🧪 예제

```
file read path="./nums.txt" -> txt
math op="avg" arr=txt -> avg
echo value=avg -> result
```

---

# 🧩 AI 연동

AI는 다음 정보를 기반으로 qplan 스크립트를 생성할 수 있습니다:

```
registry.list()
→ [{ id, description, usage, inputs }]
```

이를 프롬프트에 전달하면  
AI가 자동으로 qplan 워크플로우를 생성할 수 있습니다.

---

# 📦 설치 & 실행

```
npm install
npm run build
node examples/demo.js
```

---

# 🤝 모듈 작성 가이드

### 함수형

```
export const addModule = Object.assign(
  (inputs) => Number(inputs.a) + Number(inputs.b),
  { id:"add", description:"..." }
)
```

### 객체형

```
export const fileModule = {
  id:"file",
  description:"파일 읽기/쓰기",
  async execute(inputs, ctx) { ... }
}
```

---

# 📘 문서 링크

모든 문서는 docs/ 폴더에 포함:

- 01-overview  
- 02-grammar  
- 03-architecture  
- 04-modules  
- 05-examples  
- 06-executor  
- 07-registry  
- 08-writing-modules  
- 09-ai-integration

---

# 🏁 License
MIT
