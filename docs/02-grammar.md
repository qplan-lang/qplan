
# 02-grammar.md  
**qplan DSL Grammar — Full Specification (EBNF 포함)**

본 문서는 qplan DSL의 **정식 문법(Grammar)** 을 정의한다.  
A 버전(기본 문법) + B 버전(전체 EBNF) 둘 다 포함되어 있으므로  
**이 문서 하나로 전체 DSL을 완전히 이해할 수 있다.**

---

# 1. qplan DSL 개요

qplan DSL은 다음과 같은 형태로 구성된 작은 워크플로우 언어이다:

- Action 실행  
- 변수 저장  
- If 조건문  
- Parallel 병렬 실행  
- Future/Join 비동기 처리  
- ExecutionContext 기반 참조  

예:
```
math op="add" a=1 b=2 -> x
sleep ms=500 -> done
```

---

# 2. 기본 문법 (A 버전)

## 2.1 Action 문법

```
<module> <args> [-> <var>]
```

예:
```
math op="add" a=1 b=2 -> sum
file op="read" path="./data.txt" -> txt
sleep ms=500            # 결과 저장 안 함
```

---

## 2.2 Arguments(키=값)

지원 타입:
- 숫자
- 문자열 "text"
- JSON `[1,2,3]`, `{"x":1}`
- ctx 값 참조 (문자열이 ctx 변수명과 일치하면 자동 대입됨)

예:
```
math op="avg" arr="[1,2,3]"
ai prompt="요약" context=html
```

---

## 2.3 Output Binding

```
[-> 변수명]
```

작성하지 않으면 해당 액션 결과는 ctx에 저장되지 않는다. 저장이 필요할 때만 `-> 변수명`을 붙인다.

---

## 2.4 If 조건문

```
if <left> <op> <right> {
    ...
} else {
    ...
}
```

지원 비교 연산자:
```
> < >= <= == != EXISTS NOT_EXISTS
```

예:
```
if total > 10 {
    echo msg="big" -> r
} else {
    echo msg="small" -> r
}
```

---

## 2.5 Parallel 병렬 실행

```
parallel {
    ...
    ...
} concurrency=3 ignoreErrors=true
```

옵션:
- concurrency: 동시 실행 개수
- ignoreErrors: true면 에러 무시

---

## 2.6 Future / Join

Future 생성:
```
future delay=500 value="done" -> f1
```

Join:
```
join futures="f1,f2,f3" -> result
```

## 2.7 Each 반복문

```
each prices as (item, idx) {
  ...
}
```

`prices` 는 ctx에 저장된 배열/이터러블이어야 한다. `as (value, idx)` 에서
 - `value` 는 필수이며 각 원소가 바인딩된다.
 - `idx` 는 선택이며 현재 인덱스가 저장된다.

예:
```
each prices as (price, i) {
  math op="add" a=total b=price -> total
  math op="add" a=i b=1 -> nextIndex
}
```

루프 내부에서는 `stop` / `skip` 를 사용해 흐름을 제어할 수 있다.

---

# 3. EBNF 전체 문법 (B 버전)

아래는 qplan DSL의 **정식 EBNF 문법**이다.

```
Script          = { Statement } ;

Statement       = Action
                | IfStmt
                | ParallelStmt
                | EachStmt
                | StopStmt
                | SkipStmt ;

Action          = ModuleName , { Argument } , [ "->" , Identifier ] ;

ModuleName      = Identifier ;

Argument        = Identifier , "=" , Value ;

Value           = Number
                | QuotedString
                | JsonObject
                | JsonArray
                | Identifier ;

IfStmt          = "if" , Condition , Block , [ ElseBlock ] ;

Condition       = Identifier , Comparator , (Number | QuotedString | Identifier) ;

Comparator      = ">" | "<" | ">=" | "<=" | "==" | "!=" | "EXISTS" | "NOT_EXISTS" ;

ElseBlock       = "else" , Block ;

Block           = "{" , { Statement } , "}" ;

ParallelStmt    = "parallel" , Block , [ ParallelOptions ] ;

EachStmt        = "each" , Identifier , "as" , "(" , Identifier , [ "," , Identifier ] , ")" , Block ;

StopStmt        = "stop" ;
SkipStmt        = "skip" ;

ParallelOptions = "concurrency=" , Number , [ "ignoreErrors=" , Boolean ] ;

Identifier      = Letter , { Letter | Digit | "_" | "-" } ;

QuotedString    = """ , { ANY_CHAR_BUT_QUOTE } , """ ;

Number          = Digit , { Digit } ;

Boolean         = "true" | "false" ;

JsonObject      = "{" , { JsonPair , { "," , JsonPair } } , "}" ;
JsonPair        = QuotedString , ":" , JsonValue ;
JsonValue       = QuotedString | Number | JsonObject | JsonArray ;

JsonArray       = "[" , [ JsonValue , { "," , JsonValue } ] , "]" ;
```

---

# 4. 실행 규칙

## 4.1 Action 실행 규칙
1) `<module>` 이름으로 ModuleRegistry에서 모듈을 찾는다  
2) args를 객체로 만든 후 execute(inputs, ctx) 호출  
3) 반환값을 ctx.set(outputVar, result) 저장  

---

## 4.2 ctx 변수 해석 규칙
- args 값이 문자열이고 동일한 변수가 ctx에 존재하면 ctx 값을 참조  
- JSON 문자열은 자동으로 객체로 변환되지 않음 (모듈 내부에서 처리)

---

## 4.3 Future 규칙
- future 모듈은 `{ __future: Promise }` 형태 반환해야 함  
- executor는 future를 ctx에 Promise로 저장함

---

## 4.4 Join 규칙
- join은 ctx에서 future들을 꺼낸 뒤 Promise.all 로 병렬 실행  
- 결과는 배열로 반환

---

## 4.5 Parallel 규칙
- 내부 Statement 각각을 executeNode로 실행  
- concurrency 옵션으로 병렬 degree 제한  
- ignoreErrors=true면 오류 무시  

---

# 5. 예제 (문법 종합)

```
file op="read" path="./nums.txt" -> raw
math op="avg" arr=raw -> avg

if avg > 50 {
    echo msg="high" -> result
} else {
    echo msg="low" -> result
}

parallel {
    sleep ms=300 -> a
    sleep ms=100 -> b
} concurrency=2 ignoreErrors=true
```

---

# 6. 문법 요약

- Action 기반 단순 DSL  
- prefix 없음 (모듈 이름이 곧 명령어)  
- arguments = key=value  
- JSON 지원  
- Future/Join/Parallel 내장  
- If 조건은 숫자/문자열 비교  

---

**이 문서를 기반으로 qplan DSL을 완전히 파싱하고 실행할 수 있다.**
