# 06-executor.md

## Executor 역할
- AST를 순회하면서 Action/If/Each/Parallel 실행
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

## Each 규칙
- `each list as (item)` 혹은 `each list as (item, idx)`
- `list` 는 ctx에 존재해야 하며 배열 또는 iterable 이어야 함
- 반복마다 `item` 변수에 값을 저장하고 블록 실행
- `idx` 를 지정하면 현재 인덱스 값도 함께 저장
- 루프 안에서는 `stop` / `skip` 사용 가능
