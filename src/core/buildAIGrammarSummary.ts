/**
 * buildAIGrammarSummary()
 * ---------------------------------------------
 * AI가 qplan DSL을 정확히 작성할 수 있도록
 * 전체 DSL 문법을 "AI-friendly" 형식으로 축약/정리한 문법 문자열을 생성한다.
 *
 * - grammar.md 전체를 직접 넣는 것은 너무 길고 비효율적이므로
 *   문법의 핵심만 AI에게 필요한 형태로 요약 제공한다.
 * - buildAIPlanPrompt() 에 삽입하면 효과적.
 *
 * 목적:
 *  - AI가 qplan DSL을 완벽히 이해하도록 함
 *  - 문법 오류 없이 Action/If/Parallel/Future/Join 모두 생성 가능
 */

export function buildAIGrammarSummary(): string {
  return `
-----------------------------------------
qplan DSL Core Grammar (AI-Friendly Summary)
-----------------------------------------

1) Action
-----------------------------------------
<moduleName> [option] key=value key=value [-> outputVar]

예)
math add a=1 b=2 -> x
file read path="./a.txt" -> txt


2) Arguments
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


3) Output Binding
-----------------------------------------
필요한 경우에만 "-> 변수명" 을 붙여 결과를 저장.
생략하면 해당 액션의 반환값은 ctx에 저장되지 않음.


4) If 문
-----------------------------------------
형식:
if <left> <OP> <right> [and/or <left> <OP> <right> ...] {
   ... qplan 명령 ...
} else {
   ... qplan 명령 ...
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


5) Parallel 병렬 블록
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


6) Each 반복문
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


7) Future 생성
-----------------------------------------
형식:
future key=value -> futureName

설명:
- future module은 Promise를 생성하여 ctx에 저장
- join 과 함께 사용

예)
future delay=300 value="done" -> f1


8) Join (Future 결합)
-----------------------------------------
형식:
join futures="f1,f2,f3" -> out

설명:
- ctx에서 f1, f2, f3 이름으로 저장된 Promise들을 병렬 resolving
- Promise.all 형태


9) ctx 변수 규칙
-----------------------------------------
- action 결과는 ctx에 저장
- key=value 에서 value가 문자열인데 ctx에 동일 key 가 있으면 ctx 값을 사용

예)
echo msg="hello" -> x
echo msg=x -> y    (여기서 x는 "hello")


10) 문자열 규칙
-----------------------------------------
문자열은 반드시 "..." 로 감싸야 함.
JSON 문자열 내부의 " 는 \\" 로 이스케이프해야 함.


11) 스크립트 구조
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
