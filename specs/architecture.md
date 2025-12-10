# qplan Architecture

qplan은 **AI가 작성한 DSL을 파싱하고 실행하는 워크플로우 엔진**이다.  
이 문서는 qplan의 전체 구조와 핵심 컴포넌트들을 설명한다.

---

# 1. Architecture Overview

```
qplan script
      ↓
Tokenizer → Parser → AST → Executor → 결과 반환
                   ↑
             Module Registry
```

---

# 2. Components

## 2.1 Tokenizer (Lexer)
DSL 텍스트를 토큰 단위로 분해하는 단계.

### 역할
- 키워드(FETCH, IF, END 등) 식별
- 문자열, 숫자, 식별자 분리
- key=value 패턴 인식
- 공백/줄바꿈 처리
- 주석 제거

### 출력
토큰 리스트(Token List)

---

## 2.2 Parser
토큰 리스트를 읽어 **AST(Abstract Syntax Tree)** 로 변환.

### 역할
- EBNF 문법 검증
- FETCH / CALL / CALC / AI 구조 해석
- IF/ELSE/END, PARALLEL/END 블록 생성
- Syntax Error 감지

### 출력
AST 루트 노드

---

## 2.3 AST (Abstract Syntax Tree)

각 Statement는 다음과 같은 AST Node로 구성된다:

```
FetchNode
CallNode
CalcNode
AiNode
IfNode
ParallelNode
BlockNode
```

### 예:
```
IF price.close > ma20:
    AI ...
ELSE:
    AI ...
END
```

→ IfNode(condition, trueBlock, falseBlock)

---

## 2.4 ExecutionContext

실행 중 필요한 변수 저장소.

### 기능
- 변수 set/get
- 결과 저장
- 모듈 입력 매핑

```java
ctx.set("price", result);
ctx.get("ma20");
```

---

## 2.5 Module Registry

모든 실행 가능한 모듈(ActionModule)을 보유한다.

```
FETCH → FetchPriceModule
CALC → CalcModule
AI   → AiModule
```

엔진 초기화 시 등록됨.

---

## 2.6 Executor (Runtime Engine)

AST를 순회하며 모듈 실행.

### 기능
- 순차 실행
- 조건 분기(IF/ELSE)
- 병렬 실행(PARALLEL)
- 에러 처리
- 모듈 입력/출력 관리

---

# 3. Execution Flow

## 3.1 순차 실행
```
FETCH price -> price
CALC ma20 price -> ma20
```

→ 순서대로 실행

---

## 3.2 조건 분기
```
IF a > b:
    ...
ELSE:
    ...
END
```

→ 조건 true면 첫 블록 실행, 아니면 ELSE 실행  
→ 다른 언어의 if-else와 동일한 구조

---

## 3.3 병렬 실행
```
PARALLEL:
    FETCH ...
    FETCH ...
END
```

→ 내부의 statements는 **멀티스레드로 동시에 실행**  
→ ExecutorService 활용

---

# 4. Error Handling

종류:
- Syntax Error: 파서 단계에서 검출
- Unknown Module Error: 미등록 모듈 호출
- Execution Error: 모듈 실행 중 예외
- Missing Argument Error: key=value 누락

에러는 모두 qplanException으로 래핑되어 외부로 전달된다.

---

# 5. Example Architecture Diagram

```
          +-----------------------+
          |       qplan DSL       |
          +-----------+-----------+
                      |
                      v
          +-----------------------+
          |       Tokenizer       |
          +-----------+-----------+
                      |
                      v
          +-----------------------+
          |        Parser         |
          +-----------+-----------+
                      |
                      v
          +-----------------------+
          |         AST           |
          +-----------+-----------+
                      |
                      v
          +-----------------------+
          |       Executor        |
          +-----------+-----------+
         /                      v                v
+---------------+   +--------------+
| ExecutionCtx  |   | ModuleRegistry|
+---------------+   +--------------+
```

---

# 6. Thread Model (Parallel Execution)

- 기본은 순차 실행  
- PARALLEL 블록만 ExecutorService로 비동기 실행  
- Future로 결과 수집  
- ExecutionContext에 merge

Thread-safe하게 Context 관리 필요

---

# 7. File Structure Example

```
qplan/
 ├─ src/
 │   ├─ lexer/
 │   │    └─ Tokenizer.java
 │   ├─ parser/
 │   │    ├─ Parser.java
 │   │    └─ AST Nodes
 │   ├─ executor/
 │   │    ├─ Executor.java
 │   │    ├─ ParallelExecutor.java
 │   │    └─ ExecutionContext.java
 │   ├─ modules/
 │   │    ├─ FetchModule.java
 │   │    ├─ CalcModule.java
 │   │    └─ AiModule.java
 │   └─ registry/
 │        └─ ModuleRegistry.java
 ├─ docs/
 └─ README.md
```

---

# 8. Future Extensions

예정된 확장 요소:

### Engine 확장
- LOOP (반복 실행)
- TRY/CATCH
- 스케줄 모듈(SCHEDULE)
- 변수 타입 시스템 추가
- 서브워크플로우 import 기능

### 언어 확장
- pipeline-style syntax
- 함수 정의
- 감시자(watch) 기능

---

# 9. Version
qplan architecture v1.0 (Draft)
