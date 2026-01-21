# 06-executor.md

## 1. Executor 개요
Executor(`src/core/executor.ts`) 는 파서가 생성한 AST와 ModuleRegistry, ExecutionContext를 받아 **Step 단위로 워크플로우를 실행하는 핵심 엔진**이다. 실행 과정은 다음과 같다.

1. `resolveSteps(root.block)` 으로 Step 트리를 분석하고 `StepController` 를 초기화한다.
2. AST 블록을 위에서부터 순회하며 Action/If/While/Each/Parallel/Set/Return/Jump/Step 을 처리한다.
3. Action 결과는 ExecutionContext(ctx)에 저장되고, Step Controller는 onError 정책과 이벤트 훅을 담당한다.
4. Jump나 onError="jump" 정책이 발생하면 현재 블록 인덱스를 다시 계산해 지정 Step으로 이동한다.

```
Executor.run(ast, ctx)
  └─ resolveSteps(ast.block)
  └─ while (true)
        executeBlock(block)
            └─ executeNode(node)
                - Action / If / While / Each / Parallel / Step / Jump ...
```

## 2. Action 실행 규칙
- 모듈 조회: `registry.get(node.module)` 로 ActionModule 을 가져온다. 모듈이 없으면 오류.
- 실행 방식
  1. 함수형 모듈: `await mod(args, ctx)`
  2. 객체형 모듈: `await mod.execute(args, ctx)`
- Future 처리: 결과가 `{ __future: Promise }` 형태면 ctx에는 Promise만 저장하고 즉시 반환한다.
- 자동 저장: 기본적으로 `ctx.set(node.output, result)` 를 수행한다. 일부 모듈(var/print)에서는 Parser가 `__suppressStore` 를 세팅해 생략할 수 있다.

## 3. 조건문 / 반복문 / 흐름 제어
### If / While
- 비교 연산자: `> < >= <= == != EXISTS NOT_EXISTS`
- 논리 연산: `AND`, `OR`, `not`, 괄호 우선순위 지원
- 왼쪽/오른쪽 피연산자는 ctx 변수 또는 `stats.total` 같은 dot-path 모두 허용된다.
- While 은 If와 동일한 조건식을 반복에 사용하고, 내부에서 `stop`/`skip` 가능하다.

### Each
- 문법: `each item in iterable { ... }` 또는 `each (item, idx) in iterable { ... }`
- iterable 은 ctx에 존재해야 하며 배열/이터러블이면 된다.
- 반복 도중 `stop` 은 루프 탈출, `skip` 은 다음 반복으로 이동한다.

### Parallel
- 문법: `parallel { ... } concurrency=2 ignoreErrors=true`
- 옵션은 블록 앞/뒤 어느 쪽에 둬도 되며, `parallel: ... END` 구문도 지원한다.
- 내부 명령을 동시에 실행하되 `concurrency` 로 동시 실행 수를 제한한다.
- `ignoreErrors=true` 면 일부 Action 오류를 무시하고 계속 진행한다.

### Jump / Set / Return
- `jump to="stepId"` 는 Step ID 대상으로만 이동 가능하며, StepController가 JumpSignal을 던져 실행 지점을 재설정한다.
- `set target = expression` 은 기존 ctx 변수만 수정할 수 있고 `+ - * /` 및 괄호를 지원한다.
- `return key=value ...` 는 Step 결과 객체를 구성한다. 최소 1개 이상의 key=value 쌍이 필요하다.

## 4. StepController와 onError 정책
Executor는 Step을 실행할 때 `StepController.runStep()` 을 호출해 다음 로직을 위임한다.

| 정책 | 동작 |
| --- | --- |
| `fail` | 기본값. 오류 발생 시 즉시 throw. |
| `continue` | 오류를 기록하고 Step을 성공으로 간주하고 다음으로 이동. |
| `retry=N` | 최대 N회 재시도. 각 재시도마다 `onStepRetry` 이벤트 호출. |
| `jump="stepId"` | 오류 시 지정 Step으로 JumpSignal 발생. |

StepController는 또한 `onStepStart/End/Error/Retry/Jump` 이벤트뿐만 아니라 플랜 레벨 이벤트인 `onPlanStart/End`, 그리고 실행 제어 이벤트(`onAbort`, `onPause`, `onResume`, `onTimeout`, `onStateChange`)도 호출해 UI/로그 시스템이 상세 진행 상황을 추적할 수 있도록 한다. Step 결과는 `ctx[runId][namespace]` 에 저장되며, namespace 기본값은 Step ID 이지만 `step ... -> resultVar` 로 변경할 수 있다. namespace 를 바꿔도 동일 객체를 Step ID 아래에도 복제하므로 같은 실행(run) 안에서는 `resultVar.xxx` 와 `stepId.xxx` 를 모두 사용할 수 있다.

## 5. ExecutionContext 상호작용
- Executor는 `ctx.set(name, value)` 로 Action 결과를 저장하고, 이후 Action 인수에서 문자열이 ctx 변수와 일치하면 자동으로 해당 값을 대입한다.
- dot-path(`order.detail.status`) 접근은 `ExecutionContext.resolvePath()` 가 처리한다.
  - 없는 속성에 접근하면 에러를 내지 않고 `undefined`를 반환한다(안전한 접근).
  - 배열일 경우 `.length`와 `.count` 속성을 통해 길이를 반환한다.
- `ctx.toJSON()` 으로 전체 상태를 덤프해 디버깅에 활용할 수 있다.

## 6. Future + Join 실행 흐름
1. `future` 모듈이 `{ __future: Promise }` 를 반환하면 Executor는 output 변수에 Promise를 저장한다.
2. `join futures="f1,f2"` 는 ctx에서 각 future 이름을 찾아 Promise.all 을 수행하고 결과 배열을 반환한다.
3. Step 결과나 다른 Action에서 해당 배열을 dot-path 로 재사용할 수 있다.

## 7. 에러 처리 & Jump 내부 동작
- JumpSignal: `jump to="stepId"` 나 onError jump 정책이 발생하면 JumpSignal을 던져 현재 블록 실행을 중단한다.
- Block override: Executor는 Jump 대상 Step 정보(`block`, `statementIndex`, `parent`) 를 따라가며 다음 반복 시 시작 위치를 덮어쓴다.
- Retry 루프: StepController가 retry 정책을 적용할 때마다 Executor는 같은 Step 블록을 다시 실행한다.

## 8. 예시 – Executor가 처리하는 Step 흐름
```qplan
step id="pipeline" desc="전체 파이프라인" {
  step id="prepare" desc="준비" {
    file read path="./data.txt" -> raw
    return raw=raw
  }

  step id="process" desc="연산" onError="retry=2" {
    math op="div" a=raw b=0 -> impossible   # 실패 → retry
  }

  step id="cleanup" desc="마무리" onError="continue" {
    print text="done"
  }

  return final=process
}
```
- Executor는 Step 트리를 순서대로 실행하되, process Step 에서 오류가 나면 retry를 수행하고, cleanup Step 은 오류가 나도 continue 정책으로 넘어간다.

이 문서를 참고하면 Executor의 내부 흐름과 StepController/ExecutionContext와의 상호작용을 이해할 수 있으며, 커스텀 모듈이나 Step 이벤트 훅을 설계할 때 도움을 받을 수 있다.
