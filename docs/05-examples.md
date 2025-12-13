# 05-examples.md

이 문서는 QPlan 언어의 대표적인 사용 예제를 Step 중심으로 정리한 것이다. 각 예제는 `runQplan` 으로 즉시 실행할 수 있으며, 필요한 모듈은 기본 `basicModules` 또는 `src/modules/basic` 에 포함된 모듈들이다.

## 1. Hello QPlan – 가장 단순한 Step
```qplan
step id="hello" desc="첫 출력" {
  echo msg="hello" -> out
  print text=out
}
```
- 모든 Action은 Step 내부에 있어야 한다.
- `echo` 결과는 `out` 변수에 저장되고 `print` 가 ctx 변수 참조로 바로 사용한다.

## 2. 파일 읽기 + 평균 계산
```qplan
step id="load" desc="파일 읽기" -> dataset {
  file read path="./nums.txt" -> raw
  json parse data=raw -> parsed
  return list=parsed
}

step id="avg" desc="평균 계산" -> stats {
  math op="avg" arr=dataset.list -> avg
  math op="sum" arr=dataset.list -> total
  return average=avg total=total
}

step id="report" desc="출력" {
  print label="total" value=stats.total
  print label="avg" value=stats.average
}
```
- 파일에서 읽은 JSON 배열을 파싱하고, 평균/합계를 계산한다.
- Step `load` 의 결과를 `dataset.list` 로 dot-path 참조한다.

## 3. Future + Join 기반 비동기 작업
```qplan
step id="async" desc="Future 생성" -> futures {
  future task="A" delay=300 value="doneA" -> f1
  future task="B" delay=500 value="doneB" -> f2
  return list=[f1,f2]
}

step id="join" desc="Future 합치기" -> results {
  join futures="f1,f2" -> values
  return values=values
}
```
- `future` 모듈이 `{ __future: Promise }` 를 ctx에 저장하므로 `join` 은 이름 목록으로 Promise.all 을 수행한다.

## 4. Parallel 블록 + 오류 무시
```qplan
step id="parallelWork" desc="병렬 실행" {
  parallel concurrency=2 ignoreErrors=true {
    echo msg="A" -> a
    sleep ms=100 -> s1
    sleep ms=50 -> s2
    jump to="skip"   # parallel 블록 안에서도 step 제어 가능 (존재하는 step일 때)
  }
}

step id="skip" desc="다음 작업" {
  print text="parallel finished"
}
```
- parallel 블록은 `concurrency` 와 `ignoreErrors` 옵션을 블록 앞/뒤 어느 쪽에 둬도 된다.
- Jump는 Step ID를 대상으로만 작동한다.

## 5. Each 반복 + stop/skip
```qplan
step id="loop" desc="반복 예제" -> summary {
  var 0 -> total
  json parse data="[1,2,3,4]" -> nums
  each (n, idx) in nums {
    if n == 3 {
      stop
    }
    if idx == 0 {
      skip
    }
    math add a=total b=n -> total
  }
  return count=nums.length total=total
}
```
- `each` 블록 내부에서 `stop` 을 호출하면 현재 each 를 탈출, `skip` 은 다음 반복으로 이동한다.
- `nums.length` 처럼 dot-path 접근은 ExecutionContext가 처리한다.

## 6. While + Set 으로 카운터 조작
```qplan
step id="counter" desc="while 루프" -> result {
  var 0 -> count
  while count < 5 {
    set count = count + 1
  }
  return final=count
}
```
- `set` 은 기존 ctx 변수만 수정할 수 있다. 루프 내부에서 단순 산술을 표현한다.

## 7. Step onError 정책 & jump
```qplan
step id="prepare" desc="초기화" {
  var 0 -> retryCount
}

step id="mayFail" desc="실패 예제" onError="retry=2" -> payload {
  math op="div" a=1 b=retryCount -> fail   # 첫 실행에서 0 나누기 → 에러 → retry
  return value=fail
}

step id="cleanup" desc="에러 처리" onError="continue" {
  jump to="summary"
}

step id="summary" desc="결과 정리" {
  print final=payload.value
}
```
- `onError="retry=2"` 가 Step 전체를 재시도하고, 실패하면 마지막 에러를 던진다.
- `cleanup` Step 은 onError="continue" 로 안전하게 마무리 후 `jump` 로 summary 로 이동한다.

## 8. AI + 모듈 메타데이터 활용 예시
```ts
import { buildAIPlanPrompt, registry } from "qplan";
import { httpModule } from "qplan/dist/modules/basic/http.js";

registry.register(httpModule);
const prompt = buildAIPlanPrompt("오픈 API에서 데이터를 가져와 정리해줘");
const script = await callLLM(prompt);
await runQplan(script);
```
- registry에 모듈을 등록하면 Prompt Builder가 자동으로 사용법을 AI에 전달한다.

## 9. 실행 전 검증
```bash
npm run validate -- examples/12_exam_step.qplan
```
- 문법/Step 구조/jump 대상 등을 조기에 검증하면 실행 시 오류를 줄일 수 있다.

상기 예제들을 참고해 자신만의 ActionModule을 추가하거나 Step 구조를 응용하면 다양한 자동화 시나리오를 QPlan으로 표현할 수 있다.
