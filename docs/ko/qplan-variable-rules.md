# QPlan Variable System & Safety Rules

이 문서는 QPlan Language에서 변수가 생성·수정·사용되는 방식을 하나의 규칙으로 통합해 정리한 공식 문서다.  
모든 내용은 최신 문법( `var` 모듈, `set` 문, `each/while` 반복, validator 등)에 맞춰져 있다.

---

## 1. 왜 “통제된 변수 시스템”이 필요한가?

QPlan의 핵심 목표는 **Deterministic / Traceable / AI-friendly** 한 워크플로우다.  
따라서 파서/실행기가 정확히 이해할 수 있는 위치에서만 변수가 생기거나 바뀌어야 한다.

안전한 모델을 유지하면 다음을 보장할 수 있다.

- **예측 가능성** – 실행할 때마다 동일한 결과
- **디버깅 용이성** – 변수 생성 지점을 명확히 추적 가능
- **AI 안전성** – AI가 잘못된 코드를 생성해도 문법에서 차단

---

## 2. 변수 생성 경로

### 2.1 Action Output (일반 모듈)

```
math add a=1 b=2 -> sum
file read path="./data.txt" -> txt
future delay=300 -> f1
```

- `-> 변수명`을 붙이면 **새 변수가 생성**된다.  
- 이미 존재한 이름이면 **재할당**만 수행된다.
- 모든 모듈이 이 방식을 따른다.

### 2.2 `var` 모듈 (리터럴 전용)

```
var 0 -> count
var "hello" -> msg
var [1,2,3] -> items
var {"a":1} -> config
```

- Parser가 문자열/숫자/JSON literal을 직접 읽어 value로 전달한다.
- 결과는 Action output과 동일하게 ctx에 저장된다.
- 리터럴을 빠르게 초기화할 때 사용한다.

### 2.3 루프 제공 변수

- `each item in list` ⇒ `item`, `idx` (선택) 처럼 루프가 제공하는 스코프 변수는 자동으로 생성된다.
- `while` 은 자동 변수를 제공하지 않지만, 루프 내부에서 `set` 을 통해 기존 변수를 업데이트하여 제어한다.
- 루프 외부에서는 접근하지 않는 것이 좋다(단, 실제 ctx에는 저장되므로 덮어쓰기에 주의).

### 2.4 Dot-path 접근

- Step 결과나 JSON 객체를 ctx에 저장해 두면 `stats.total`, `order.detail.status` 처럼 점(dot)으로 이어진 경로로 하위 필드를 직접 참조할 수 있다.
- Dot-path는 정적 문자열로 작성해야 하며, 실행 중 문자열을 조립하거나 `set` 으로 새 경로를 만들어 쓰는 방식은 허용되지 않는다.

---

## 3. 변수 수정 경로 – `set` 문

```
set count = count + 1
set total = (total + delta) * 2
set config = {"limit": 10}
```

- `set` 대상 변수는 **이미 존재해야 한다**. 없으면 실행 시 에러.  
- expression 문법:
  - 숫자 / 문자열 / JSON literal
  - ctx 변수 참조 (문자열이 ctx 키와 같으면 자동 치환)
  - 괄호 `()` 와 산술 연산 `+ - * /`
  - 단항 `-`
- `set` 은 **수정 전용**이며 새로운 변수를 만들 수 없다.

---

## 4. 금지 & 제한 사항

금지되는 패턴과 이유:

| 금지 항목 | 설명 |
|-----------|------|
| `ctx.set()` 직접 호출 | 엔진 내부 API. Language 외부에서 상태 조작 금지 |
| 동적 변수명 생성 | `foo_${timestamp}` 처럼 파서가 알 수 없는 이름 사용 금지 |
| `set` 으로 새 변수 생성 | Action output 구조와 충돌, 타이포가 조용히 생김 |
| 숨겨진 전역 상태/래핑 | 모듈 외부에서 임의 데이터 삽입 금지 |

허용되는 패턴:

- Action output (`-> var`)
- `var` 모듈
- 루프 제공 변수(item/idx)
- `set` 으로 기존 변수 수정

---

## 5. 루프 & 조건에서의 변수 취급

### Each / While

- `each (item, idx) in list` – `item`, `idx` 는 루프 스코프 변수. 반복마다 엔진이 덮어쓴다.
- `while condition { ... }` – 자동 변수는 없으므로 외부에서 만든 변수를 `set` 으로 업데이트.
- 둘 다 `stop` / `skip` 으로 흐름 제어 가능.

### 조건문 / 반복문에서의 비교

```
if total > limit { ... }
while count < target { ... }
```

- 오른쪽 피연산자가 문자열인데 ctx에 동일한 키가 있으면 해당 값을 읽어 비교한다.
- `EXISTS`, `NOT_EXISTS`, `not`, 괄호 등 모든 비교 문법은 if/while 공통.

---

## 6. AI를 위한 가이드라인

1. **변수 생성은 항상 Action output 또는 `var`** 로만 한다.
2. **`set` 은 수정 전용**이며 존재하지 않는 변수명을 쓰면 에러가 나므로, 먼저 생성되었는지 확인한다.
3. **동적 변수명/ctx 직접 접근은 금지** – dot-path(`stats.total`) 같은 정적 경로는 허용되지만, 문자열 조립/동적 실행으로 변수명을 만드는 것은 여전히 금지한다.
4. **루프 변수는 엔진이 관리**하니 item/idx 외 임의 변수를 자동 생성하지 않는다.
5. **실행 전 validator 사용** – `npm run validate -- <script>` 로 문법을 사전 검증하면 안전하다.

이 지침을 따르면 LLM이 생성한 스크립트도 안전하게 실행할 수 있다.

---

## 7. 전체 규칙 요약

| 기능 | 허용 방식 | 비고 |
|------|-----------|------|
| 새 변수 생성 | `Action -> var`, `var` 모듈 | ctx 키 신규 생성 |
| 기존 변수 수정 | `set var = expression` | 대상이 존재해야 함 |
| 루프 변수 | `each item (idx)` | 스코프 한정, 자동 제공 |
| 동적 변수명 | ❌ 금지 | 예측 불가 |
| ctx 직접 조작 | ❌ 금지 | 엔진 내부 전용 |

---

## 8. 예시 전체 흐름

```
var 0 -> total                 # 리터럴 생성
math add a=5 b=10 -> base      # Action output
set total = total + base       # 기존 변수 수정

json parse data="[1,2,3]" -> nums
each (item, idx) in nums {
    math mul a=item b=2 -> doubled
    set total = total + doubled
}

while total < 40 {
    set total = total + 1
}
```

- 변수 생성은 `var` / Action output으로만 이루어진다.
- 루프 내부에서 set 으로 기존 변수를 누적.  
- while 은 조건이 참인 동안 set 으로 total을 조정한다.

---

## 9. 결론

- QPlan 은 “동적 변수 생성 금지”가 아니라 **“통제되지 않은 경로의 변수 생성 금지”** 를 지향한다.
- Action output + `var` + `set` + validator 조합 덕분에
  - 예측 가능
  - 안전
  - AI가 사용하기 쉬운
  Language 흐름을 유지할 수 있다.

본 문서는 변수 생성/수정과 관련된 공식 참고 자료로 사용한다.
