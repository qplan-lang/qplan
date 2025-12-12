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

- **Step 기반 흐름 제어**  
  step/jump/error policy 구조로 복잡한 실행 단계를 정의하고, UI/로그와 연동되는 이벤트를 제공.  
- **조건/반복/병렬 처리 지원**  
  IF / ELSE / EACH / PARALLEL 블록과 함께 step 트리로 복잡한 흐름 표현 가능.  

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
step id="load" desc="데이터 읽기" {
  file op="read" path="./data.json" -> raw
}

step id="calc" desc="평균 계산" -> avg {
  math op="avg" arr=raw -> result
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON()); // { raw: [...], result: 42, avg: 42 }
```

### Step 이벤트 훅 연결
```
import { runQplan } from "qplan";

const ctx = await runQplan(script, {
  stepEvents: {
    async onStepStart(info) {
      console.log("▶ step start", info.stepId, info.path.join(" > "));
    },
    async onStepEnd(info, result) {
      console.log("✔ step end", info.stepId, "result:", result);
    },
  },
});
```
`RunQplanOptions.stepEvents` 를 이용하면 UI/CLI/로그와 연동해 진행률을 추적하거나, jump/retry/error 이벤트를 받을 수 있다.

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
| var | 리터럴 값을 ctx 변수로 저장 |
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

### Step
```
step id="fetch" desc="데이터 가져오기" onError="retry=3" {
  http url="https://api.example.com" -> response
}

step id="branch" desc="조건 분기" {
  if response.count > 10 {
    jump to="cleanup"
  }
}

step id="cleanup" desc="정리" -> summary {
  return data=response count=response.count
}
```
- 모든 Action은 Step 내부에서 실행된다.
- `id` 를 지정하면 다른 Step에서 `jump to="<id>"` 로 이동할 수 있다.
- `onError` 정책(`fail`/`continue`/`retry=n`/`jump="cleanup"`)과 `-> outputVar` 로 Step 전체 결과를 변수에 저장할 수 있다.
- `return` 을 생략하면 Step 내부 마지막 Action 결과가 저장되며, 필요 시 `return key=value ...` 구문으로 원하는 값을 묶어 반환할 수 있다.
- 다양한 에러 처리(onError) 시나리오는 `examples/15_exam_step_error.js` 예제에서 확인할 수 있다.


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
stop/skip 은 while 반복에서도 동일하게 동작.

### While
```
while count < 10 {
  set count = count + 1
}
```
조건이 true 인 동안 블록을 반복 실행한다. stop/skip 으로 탈출/다음 회차 이동 가능.

### Set
```
set total = total + 1
set msg = "updated"
set config = {"limit": 5}
```
기존 ctx 변수만 수정할 수 있으며 없으면 에러가 발생한다. 산술 연산(+,-,*,/), 괄호, 문자열/숫자/JSON/ctx 변수를 조합해 값을 계산한다.

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

# ✅ 문법 검증 도구

AI가 생성한 스크립트나 수동 작성한 qplan 파일을 실행 전에 검사하려면 빌드 후 validator를 실행하세요.

```
npm run build
npm run validate -- ./examples/validator_sample.qplan
```

표준 입력을 사용할 수도 있습니다.

```
echo 'var 0 -> count' | npm run validate -- -
```

성공 시 `✅ Valid qplan script` 문구가 표시되고, 실패 시 라인 번호와 에러 메시지를 출력하며 종료 코드 1을 반환합니다.

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
