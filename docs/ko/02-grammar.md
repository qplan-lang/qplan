# 02-grammar.md  
**QPlan Language Grammar — Full Specification (EBNF 포함)**

본 문서는 QPlan Language의 **정식 문법(Grammar)** 을 정의한다.  
A 버전(기본 문법) + B 버전(전체 EBNF)을 모두 포함하므로 **이 문서 하나로 QPlan을 완전히 이해**할 수 있다.

---

# 1. QPlan Language 개요

QPlan Language는 **모든 Action을 Step 블록 안에서만 실행**하는 Step 기반 워크플로우 언어다.  
스크립트는 Tokenizer → Parser → AST → Executor 순서로 처리되며 ExecutionContext(ctx)에 저장된 값을 dot-path(`stats.total`)나 배열 인덱스(`items[0]`)로 재사용할 수 있다.

최소 예제:
```
step id="demo" desc="간단 합계" {
  var [1,2,3] -> items
  math op="sum" arr=items -> total
  return total=total
}
```

---

# 2. 기본 문법 (A 버전)

## 2.1 Script 구조 & Step
- 루트 스크립트는 **Step 문만** 나열할 수 있다. Step 밖에서 Action/If/Set 등을 작성하면 파서가 오류를 낸다.
- 필요하면 `plan { ... }` 블록으로 스크립트를 감싸 메타정보를 붙일 수 있다.
  ```
plan {
  @title "온보딩 플랜"
  @summary "계정 생성부터 교육 예약까지"
  @version "0.1"
  @since "2025-01-01"
  @params "keyword,item"

    step id="setup" {
      ...
    }
  }
  ```
  - 지원 메타 키: `title`, `summary`, `version`, `since`, `params`
  - 메타는 plan 블록의 시작 부분에만 선언해야 한다.
  - 한 단어 값은 따옴표를 생략할 수 있으며, 공백이 포함되면 따옴표로 감싸야 한다.
  - `@params` 는 한 줄에서 콤마로 구분하며 공백은 허용된다. 누락 시 런타임 오류가 발생한다.
  - `plan { ... }` 래퍼를 생략하고 스크립트 상단에 메타 라인을 배치해도 된다.
- Step 형태:
  ```
  step ["desc"] id="stepId" [desc="설명"] [type="task"] [onError="retry=3"] {
    ... (Action / If / While / Each / Parallel / Set / Return / Jump / Step 등)
  }
  ```
- `desc` 문자열은 step 키워드 다음에 바로 적거나 속성으로 지정할 수 있다.
- 허용 메타 속성
  - `id`: jump 대상과 Step 이벤트에서 사용하는 식별자
  - `desc`: 사람이 읽을 설명. 생략 시 step 문자열이 그대로 사용될 수 있다.
  - `type`: 임의 태그(task/group/loop 등)
  - `onError`: `fail`(기본) / `continue` / `retry=<N>` / `jump="<stepId>"`
- Step ID 는 유니코드 Letter 또는 `_` 로 시작해야 하며, 이후에는 숫자를 포함한 Letter/Number/`_` 를 사용할 수 있다.
- 어디서든 주석을 사용할 수 있다: `// 한 줄`, `# 한 줄`, `/* 여러 줄 */` 형태를 모두 지원하며 파서는 완전히 무시한다.
- Step 결과는 항상 `ctx[runId][namespace]` 에 저장되며 namespace 기본값은 Step ID(`step ... -> resultVar` 로 재정의 가능) 이다. 같은 실행(run) 안에서는 `namespace.xxx` 로 접근하며, namespace 를 바꿔도 엔진이 동일 객체를 Step ID 아래에도 복제한다.
- Step 내부에서는 추가 Step을 중첩해 Sub-step 트리를 만들 수 있다.
- 모듈 이름, 변수, Action output, `return` key, `set` 대상 등 모든 식별자는 유니코드 문자/숫자/`_` 를 포함할 수 있으며, 첫 글자는 문자 또는 `_` 이어야 한다.

## 2.2 Return 문
- Step 블록 내에서 `return key=expression ...` 형태로 작성한다.
- `=` 는 생략 가능하다. `return gear accounts total=sum` (또는 `return gear, accounts, total=sum`) 은
  `return gear=gear accounts=accounts total=sum` 으로 확장된다. 혼합 형태도 허용된다.
- 항목 구분은 공백 또는 콤마 모두 허용된다.
- 최소 1개의 값이 필요하며, 여러 항목을 나열하면 객체 형태로 Step 결과가 구성된다.
- Return을 생략하면 Step 내부에서 생성한 모든 Action output 이 자동으로 객체로 묶여
  `namespace.outputName` 으로 참조할 수 있다. 마지막 Action 결과도 내부적으로 보존된다.
- Return/마지막 Action 결과는 `ctx[runId][namespace]` 에 저장되며, namespace 는 Step ID 가 기본이고 필요 시 Step 헤더 `-> resultVar` 로 바꿀 수 있다. namespace 를 바꿔도 Step ID 이름으로 동일 객체가 자동 생성된다.

```
return total=total average=avg
return gear, accounts, total=sum   # 축약 형태
```

## 2.3 Action 문법
```
<module> [<option> { AND <option> }] <args> [-> <var>]
```
- 모든 Action은 Step 블록 내부여야 한다.
- 옵션은 모듈 이름 뒤에 붙는 식별자이며 `AND` 로 여러 개를 연결할 수 있다(AND 키워드는 대문자로 작성). 첫 번째 옵션은 자동으로 `op` 입력에 매핑된다.
- 결과를 저장하지 않으면 ctx에 기록되지 않는다. 저장하려면 `-> 변수명`을 붙인다.

예:
```
math add a=1 b=2 -> sum
file read path="./data.txt" -> txt
sleep ms=500                 # 결과 저장 안 함
http get AND cache url="..." -> raw
```

## 2.4 Arguments(키=값)
지원 타입:
- 숫자
- 문자열 "text"
- JSON `[1,2,3]`, `{ "x":1 }`
- ctx 값 참조 (문자열이 ctx 변수명, `stats.total` 같은 dot-path, `items[0]` 같은 배열 인덱스와 일치하면 자동 대입됨)

예:
```
math op="avg" arr="[1,2,3]"
ai prompt="요약" context=html
```

## 2.5 If 조건문
```
if <left> <op> <right> [and/or <left> <op> <right> ...] {
    ...
} else {
    ...
}

`plan { ... }` 래퍼를 생략하고 스크립트 상단에 `@title` / `@summary` / `@version` / `@since` / `@params`
메타 라인을 배치해도 됩니다.
```
지원 비교 연산자: `> < >= <= == != EXISTS NOT_EXISTS`  
`and`, `or`, `not` 으로 조건을 조합할 수 있고 괄호 `()` 로 우선순위를 지정 가능하다.  
왼쪽/오른쪽 피연산자는 ctx 변수명뿐 아니라 `stats.average` 같은 dot-path나 `items[0]` 같은 배열 인덱스를 그대로 사용할 수 있다.

## 2.6 Parallel 병렬 실행
```
parallel {
    ...
    ...
} concurrency=3 ignoreErrors=true
```
옵션:
- `concurrency`: 동시 실행 개수
- `ignoreErrors`: true면 에러 무시
- `parallel` 키워드 뒤 혹은 블록 뒤에 `concurrency` / `ignoreErrors` 를 둘 수 있으며 `parallel: ... END` 구문도 지원한다.

## 2.7 Future / Join
Future 생성:
```
future delay=500 value="done" -> f1
```
Join:
```
join futures="f1,f2,f3" -> result
```

## 2.8 Each 반복문
```
each item in list {
  ...
}
```
`list` 는 ctx에 저장된 배열/이터러블이어야 한다. 값과 인덱스를 동시에 사용하려면 `each (value, idx) in list` 형태를 사용한다.
루프 내부에서는 `break` / `continue` 를 사용해 흐름을 제어할 수 있다 (while 에서도 동일하게 사용 가능).

## 2.9 While 반복문
```
while count < 10 {
  ...
}
```
If 문과 동일한 조건식을 사용하며, 조건이 true 인 동안 블록을 반복한다.  
블록 안에서 `break` / `continue` 로 반복 제어가 가능하다.

## 2.10 Set 문
```
set count = count + 1
set message = "hello"
set config = {"limit":10}
```
기존 ctx 변수만 수정할 수 있다(없으면 에러).  
식(Expression)은 숫자/문자열/JSON literal/기존 변수/괄호/산술 연산(+,-,*,/)을 조합하여 작성할 수 있다.

## 2.11 제어 흐름

### 루프 제어 (Loop Control)
- `break` : each/while 루프 즉시 종료
- `continue` : 현재 반복을 건너뛰고 다음 반복으로 이동

### Plan/Step 제어
- `stop` : Plan 전체 실행 중단 (모든 Step 즉시 종료)
- `skip` : 현재 Step의 나머지 부분 건너뛰기 (다음 Step으로 이동)

### Step 이동
- `jump to="stepId"` : 동일/상위/하위 블록에 있는 다른 Step으로 즉시 이동. target은 Step ID여야 하며 문자열 또는 식별자로 작성 가능.

---

# 3. EBNF 전체 문법 (B 버전)

```
Script          = PlanBlock | { StepStmt } ;

PlanBlock       = "plan" , "{" , { PlanMeta } , { StepStmt } , "}" ;
PlanMeta        = "@" , PlanMetaKey , PlanMetaValue ;
PlanMetaKey     = "title" | "summary" | "version" | "since" ;
PlanMetaValue   = QuotedString | Number ;

StepStmt        = "step" , StepHead , [ "->" , Identifier ] , Block ;
StepHead        = [ QuotedString ] , { StepAttr } ;
StepAttr        = Identifier , "=" , StepAttrValue ;
StepAttrValue   = QuotedString | Identifier | Number ;

Block           = "{" , { Statement } , "}" ;

Statement       = Action
                | IfStmt
                | WhileStmt
                | ParallelStmt
                | EachStmt
                | BreakStmt
                | ContinueStmt
                | StopStmt
                | SkipStmt
                | SetStmt
                | StepStmt
                | JumpStmt
                | ReturnStmt ;

Action          = ModuleName , [ OptionSeq ] , { Argument } , [ "->" , Identifier ] ;
OptionSeq       = Option , { "AND" , Option } ;
Option          = Identifier ;

ModuleName      = Identifier ;

Argument        = Identifier , "=" , Value ;

Value           = Number
                | QuotedString
                | JsonObject
                | JsonArray
                | IdentifierPath ;

ReturnStmt      = "return" , ReturnEntry , { ReturnEntry } ;
ReturnEntry     = Identifier , "=" , Expression ;

IfStmt          = "if" , Condition , Block , [ ElseBlock ] ;
ElseBlock       = "else" , Block ;

WhileStmt       = "while" , Condition , Block ;

EachStmt        = "each" ,
                  ( "(" , Identifier , [ "," , Identifier ] , ")" | Identifier ) ,
                  "in" , Identifier , Block ;

ParallelStmt    = "parallel" , [ ParallelOptions ] , Block , [ ParallelOptions ] ;
ParallelOptions = { ParallelOption } ;
ParallelOption  = "concurrency" , "=" , Number
                | "ignoreErrors" , "=" , Boolean ;

JumpStmt        = "jump" , "to" , "=" , (QuotedString | Identifier) ;
BreakStmt       = "break" ;
ContinueStmt    = "continue" ;
StopStmt        = "stop" ;
SkipStmt        = "skip" ;
SetStmt         = "set" , Identifier , "=" , Expression ;

Condition       = SimpleCondition , { LogicOp , SimpleCondition } ;
SimpleCondition = [ "NOT" ] , IdentifierPath , Comparator ,
                  (Number | QuotedString | IdentifierPath) ;
LogicOp         = "AND" | "OR" ;

Comparator      = ">" | "<" | ">=" | "<=" | "==" | "!=" | "EXISTS" | "NOT_EXISTS" ;

Expression      = Term , { ("+" | "-") , Term } ;
Term            = Factor , { ("*" | "/") , Factor } ;
Factor          = Number
                | QuotedString
                | IdentifierPath
                | JsonObject
                | JsonArray
                | "(" , Expression , ")"
                | "-" , Factor ;

Identifier      = Letter , { Letter | Digit | "_" | "-" } ;
IdentifierPath  = Identifier , { "." , Identifier } ;
QuotedString    = """ , { ANY_CHAR_BUT_QUOTE } , """ ;
Number          = Digit , { Digit } ;
Boolean         = "true" | "false" ;

JsonObject      = "{" , [ JsonPair , { "," , JsonPair } ] , "}" ;
JsonPair        = QuotedString , ":" , JsonValue ;
JsonValue       = QuotedString | Number | JsonObject | JsonArray ;

JsonArray       = "[" , [ JsonValue , { "," , JsonValue } ] , "]" ;
```

---

# 4. 실행 규칙

## 4.1 Step & Action
1) Step 헤더 정보(id/desc/type/onError/output)를 저장하고 블록을 실행한다.  
2) 각 Action은 ModuleRegistry에서 모듈을 찾은 뒤 `execute(inputs, ctx)` 를 호출한다.  
3) 결과는 `-> out` 이 존재할 경우 ctx.set(out, result) 로 저장되고, Step 결과는 마지막 Action 결과 또는 `return` 객체가 된다.

## 4.2 ctx 변수 해석 규칙
- args 값이 문자열이고 동일한 변수가 ctx에 존재하면 ctx 값을 참조한다.
- `stats.total`, `user.profile.name` 같은 dot-path와 `items[0]` 같은 배열 인덱스를 허용하며, ctx 객체를 따라가며 값을 찾는다.
- JSON 문자열은 자동으로 객체로 변환되지 않는다(모듈 내부에서 처리).

## 4.3 Future / Join 규칙
- `future` 모듈은 `{ __future: Promise }` 형태를 반환해야 한다.
- Executor는 future를 ctx에 Promise로 저장하고, `join` 은 ctx에서 해당 Promise들을 꺼내 `Promise.all` 한다.

## 4.4 Parallel 규칙
- 내부 Statement를 병렬로 실행한다.
- `concurrency` 로 동시 실행 수를 제한할 수 있다.
- `ignoreErrors=true` 면 일부 Action 오류를 무시하고 계속 진행한다.

## 4.5 Jump & Error Policy
- `jump to="stepId"` 는 해당 Step 정보를 찾아 블록 실행 위치를 재설정한다.
- Step 의 `onError` 정책은 fail/continue/retry/jump 흐름을 제어하고, retry 시 `onStepRetry` 이벤트를 발생시킨다.

---

# 5. 예제 (문법 종합)

```
step id="load" desc="파일 읽기" {
  file read path="./nums.txt" -> raw
  json parse data=raw -> parsed
  return list=parsed
}

step id="stats" desc="평균 계산" {
  math op="avg" arr=load.list -> avg
  if avg > 50 {
    echo msg="high" -> note
  } else {
    echo msg="low" -> note
  }
  return average=avg note=note
}

step id="sleepers" desc="병렬 작업" {
  parallel concurrency=2 ignoreErrors=true {
    sleep ms=300 -> slow
    sleep ms=100 -> fast
  }
}
```

---

# 6. 문법 요약

- Step 강제 구조 (모든 Action/제어문은 Step 내부에만 존재)  
- Step 은 onError(fail/continue/retry/jump)와 jump 로 흐름 제어  
- Action = 모듈 이름 + 옵션(선택) + key=value arguments + optional output  
- Arguments 는 숫자/문자열/JSON/dot-path/배열 인덱스 변수 참조 지원  
- Future/Join/Parallel/Each/While/Set/Return/Jump 내장  
- If 조건은 숫자/문자열 비교 + EXISTS/NOT_EXISTS + 괄호  

---

**이 문서를 기반으로 QPlan Language를 완전히 파싱하고 실행할 수 있다.**
