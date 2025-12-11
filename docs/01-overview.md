# 01-overview.md  
**qplan DSL — AI-Driven Workflow Language**

## 🚀 qplan이란?
qplan은 **AI와 사람이 함께 사용할 수 있는 경량 DSL(Workflow Language)** 로,  
작업 흐름(Workflow), 데이터 처리, 비동기 제어(Future/Parallel) 등을  
**간결한 스크립트 형태로 구성**할 수 있도록 만든 실행 엔진이다.

핵심 목표:
- **Simple**: 한 줄 명령 → 즉시 실행  
- **Composable**: 작은 모듈들을 조합해 복잡한 작업 구성  
- **AI-Friendly**: 메타데이터 기반으로 AI가 qplan 스크립트 자동 생성  
- **Extensible**: 개발자가 쉽게 모듈을 추가  
- **Deterministic**: 실행 결과가 항상 동일  

## 🧩 핵심 구성요소
### 1) Tokenizer  
스크립트를 토큰으로 분해.

### 2) Parser → AST  
스크립트를 AST(ActionNode, IfNode, ParallelNode 등)로 변환.

### 3) Executor  
AST를 순서대로 실행.  
Future, join, parallel(concurrency), if 조건 모두 처리.

### 4) ExecutionContext  
변수를 key/value 형태로 저장하는 런타임 컨텍스트.

### 5) ModuleRegistry  
모듈을 등록/조회하는 중앙 레지스트리.

### 6) ActionModule  
모든 모듈은 다음 메타데이터를 포함:
- id  
- description  
- usage  
- inputs[]  
- execute(inputs, ctx)

함수형/객체형 모두 지원.

## 🧱 Minimal Built-in Modules(기본 6종)
- **echo** — 입력 그대로 반환  
- **sleep** — delay(ms)  
- **file** — 파일 읽기/쓰기  
- **math** — 기본 수학 연산  
- **future** — 비동기 Future 생성  
- **join** — 여러 Future 결과 결합  

## 🧩 Optional Modules
(기본 포함 아님. 필요 시 등록)
- http  
- html  
- json  
- string  
- ai(OpenAI 기반)

## 🎯 Why qplan?
1) 사람이 쓰기 쉬움  
2) AI가 생성하기 쉬움  
3) 모듈 기반 확장성  
4) 견고한 실행 엔진  

## 🎛 실행 흐름
Script → Tokenizer → Parser(AST) → Executor → ExecutionContext  

## 📦 예시
```
file op="read" path="./data.txt" -> txt
math op="avg" arr=txt -> avg
echo value=avg -> result
```

## 📌 디자인 철학
1) 모듈 중심 확장  
2) AI 친화적 구조  
3) 단순함 유지
