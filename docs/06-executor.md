# 06-executor.md

## Executor 역할
- AST를 순회하면서 Action/If/Parallel 실행
- Future 반환 시 ctx에 Promise 저장
- Join 실행 시 Promise.all

## Action 실행 규칙
1. 함수형 모듈이면 바로 호출  
2. 객체형 모듈이면 module.execute 호출  
3. 결과를 ctx.set(output) 저장

## Parallel 규칙
- concurrency 제한  
- ignoreErrors 옵션 지원

## If 규칙
지원 연산자:
```
>, <, >=, <=, ==, !=, EXISTS, NOT_EXISTS
```

