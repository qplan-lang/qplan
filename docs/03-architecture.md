# 03-architecture.md

## 시스템 아키텍처 개요
QPlan은 다음 6개 핵심 컴포넌트로 구성된다:

1. Tokenizer – 스크립트를 토큰 단위로 변환  
2. Parser – 토큰을 AST로 구축  
3. Executor – AST를 순차/병렬 실행  
4. ExecutionContext – 변수 저장소  
5. ModuleRegistry – 모듈 등록/조회  
6. ActionModule – 사용자/기본 모듈

## 전체 흐름
```
Script → Tokenizer → Parser(AST) → Executor → Context
```

## AST 구성요소
- ActionNode  
- IfNode  
- EachNode  
- ParallelNode  
- BlockNode  
- Root(ASTRoot)

## 병렬 / 반복 / Future 구조
- ParallelNode(concurrency, ignoreErrors)  
- EachNode(iterator, iterable, indexVar)  
- FutureNode → Promise 생성  
- JoinNode → Promise.all
