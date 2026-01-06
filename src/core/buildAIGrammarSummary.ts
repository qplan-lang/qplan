/**
 * buildAIGrammarSummary()
 * ---------------------------------------------
 * AI가 QPlan script를 정확히 작성할 수 있도록
 * 전체 script 문법을 "AI-friendly" 형식으로 축약/정리한 문법 문자열을 생성한다.
 *
 * - grammar.md 전체를 직접 넣는 것은 너무 길고 비효율적이므로
 *   문법의 핵심만 AI에게 필요한 형태로 요약 제공한다.
 * - buildAIPlanPrompt() 에 삽입하면 효과적.
 *
 * 목적:
 *  - AI가 QPlan Language를 완벽히 이해하도록 함
 *  - 문법 오류 없이 Action/If/Parallel/Future/Join 모두 생성 가능
 */

export function buildAIGrammarSummary(): string {
 return `
-----------------------------------------
QPlan Language Core Grammar (AI-Friendly Summary)
-----------------------------------------

0) Plan Block (optional)
-----------------------------------------
전체 스크립트를 plan 블록으로 감싸 메타정보를 붙일 수 있다.
메타는 plan 블록 시작 부분에만 선언한다.

예)
plan {
  @title "온보딩 플랜"
  @summary "계정 생성부터 교육 예약까지"
  @version "0.1"
  @since "2025-01-01"

  step id="setup" {
    ...
  }
}

지원 메타:
  - title
  - summary
  - version
  - since


1) Step & Jump
-----------------------------------------
모든 명령은 step 블록 내부에서만 실행한다.

기본 형태:
  step "설명" {
     ... action ...
  }

확장 형태:
  step id="fetch" desc="API 호출" type="task" onError="retry=3" [-> resultVar] {
     ... action ...
  }

설명:
  - id: jump 이동 대상이 되는 식별자
  - desc: 사람이 이해하기 위한 설명
  - type: 임의 태그(task/group/loop 등)
  - onError: fail(기본) / continue / retry=<N> / jump="<stepId>"
  - Step 결과는 자동으로 step ID 에 저장되며, 기본값은 마지막 action 결과
  - (선택) -> resultVar : Step 결과 namespace를 step ID 대신 다른 이름으로 저장
  - namespace를 변경해도 동일 객체가 원래 Step ID에도 저장되므로 두 이름으로 모두 참조 가능
  - (선택) return key=value ... : Step 결과를 명시적으로 구성하여 반환
  - Identifiers (모듈/변수/Action output/return key 등)는 유니코드 문자/숫자/언더스코어를 사용할 수 있으며, 첫 글자는 문자 또는 언더스코어여야 한다
  - step 내부에 다시 step 을 중첩(Sub-step)할 수 있으며, 각 sub-step도 자체 onError/jump 정책을 가진다

Jump 문법:
  jump to="<stepId>"

규칙:
  - Step ID로만 이동할 수 있다 (Action 줄로 점프 불가)
  - 블록 간 이동 가능 (Step 트리를 따라 상위/하위 위치로 점프)
  - onError 정책에 따라 fail/continue/retry/jump 흐름을 제어할 수 있음


2) Action
-----------------------------------------
<moduleName> [option] key=value key=value [-> outputVar]

예)
math add a=1 b=2 -> x
file read path="./a.txt" -> txt


3) Arguments
-----------------------------------------
형식:
  key=value

value 타입:
  - 숫자 (예: 10, 3.14)
  - 문자열 (예: "hello")
  - JSON 배열 (예: "[1,2,3]")
  - JSON 객체 (예: "{\\"a\\":1,\\"b\\":2}")
  - ctx 변수명 (문자열이며 ctx에 존재할 경우 자동 치환됨)

옵션:
  - 모듈 이름 뒤에 식별자를 둘 수 있으며 자동으로 op 로 전달됨 (내부적으로 __options[0])


4) Output Binding
-----------------------------------------
필요한 경우에만 "-> 변수명" 을 붙여 결과를 저장.
생략하면 해당 액션의 반환값은 ctx에 저장되지 않음.


5) If 문
-----------------------------------------
형식:
if <left> <OP> <right> [and/or <left> <OP> <right> ...] {
   ... QPlan 명령 ...
} else {
   ... QPlan 명령 ...
}

지원 비교 연산자:
  >, <, >=, <=, ==, !=
특수:
  EXISTS
  NOT_EXISTS
  not (앞에 붙여 부정 가능)
괄호( ) 로 우선순위를 지정할 수 있음.

예)
if total > 100 AND count < 5 {
  echo msg="big" -> r
} else {
  echo msg="small" -> r
}


6) Parallel 병렬 블록
-----------------------------------------
형식:
parallel concurrency=N ignoreErrors=true/false {
   ... action ...
   ... action ...
   ...
} -> optionalResult

설명:
- concurrency: 동시에 실행되는 작업 수
- ignoreErrors: 일부 오류 무시하고 계속 진행 여부

예)
parallel concurrency=2 {
  echo msg="A" -> a
  echo msg="B" -> b
  echo msg="C" -> c
}


7) Each 반복문
-----------------------------------------
형식:
each item in iterableVar {
   ... actions ...
}
또는
each (item, idx) in iterableVar {
   ... actions ...
}

설명:
- iterableVar 는 ctx에 저장된 배열 또는 iterable 이어야 함
- 각 반복마다 item 변수에 값을 저장
- 괄호 안에 두 번째 식별자를 적으면 index 값을 해당 변수에 저장

예)
each (price, idx) in prices {
  math add a=total b=price -> total
  math add a=idx b=1 -> nextIndex
}

반복 제어:
  stop      → 현재 each 탈출
  skip      → 다음 반복으로 건너뜀


8) While 반복문
-----------------------------------------
형식:
while <condition> {
   ... actions ...
}

설명:
- if 조건과 동일한 문법/연산자를 사용
- 조건이 참인 동안 블록 반복
- 내부에서 stop/skip 사용 가능

예)
while total < limit {
  set total = total + step
}


9) Set 문
-----------------------------------------
형식:
set <identifier> = <expression>

설명:
- 기존 ctx 변수만 수정 가능 (없으면 에러)
- expression 은 숫자/문자열/JSON literal/ctx 변수/괄호/산술 연산(+,-,*,/) 조합 가능

예)
var 0 -> count
set count = count + 1
set total = (total + delta) * 2


10) Future 생성
-----------------------------------------
형식:
future key=value -> futureName

설명:
- future module은 Promise를 생성하여 ctx에 저장
- join 과 함께 사용

예)
future delay=300 value="done" -> f1


11) Join (Future 결합)
-----------------------------------------
형식:
join futures="f1,f2,f3" -> out

설명:
- ctx에서 f1, f2, f3 이름으로 저장된 Promise들을 병렬 resolving
- Promise.all 형태


12) ctx 변수 규칙
-----------------------------------------
- action 결과는 ctx에 저장
- key=value 에서 value가 문자열인데 ctx에 동일 key 가 있으면 ctx 값을 사용

예)
echo msg="hello" -> x
echo msg=x -> y    (여기서 x는 "hello")


13) 문자열 규칙
-----------------------------------------
문자열은 반드시 "..." 로 감싸야 함.
JSON 문자열 내부의 " 는 \\" 로 이스케이프해야 함.


14) 스크립트 구조
-----------------------------------------
- 여러 action/if/parallel/future/join 명령들을 줄 단위로 나열
- 블록 내부는 {} 로 감싸며 줄바꿈하여 작성

예)
file read path="./data.txt" -> txt
math op="avg" arr=txt -> avg
echo msg=avg -> result

-----------------------------------------
# End of AI-friendly grammar
-----------------------------------------
`.trim();
}
