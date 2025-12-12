import { runQplan } from "../dist/index.js";

/**
 * 예제: Step onError 정책 (fail | continue | retry | jump)
 */
const script = `
step id="init" desc="초기화" {
  var 0 -> retryCounter
  print "초기화 완료"
}

step id="failExample" desc="기본 fail (데모용)" onError="continue" {
  print "fail 예제 시작"
  math add a=missingVar b=1 -> broken
  print "이 코드는 실행되지 않습니다"
}

step id="continueExample" desc="continue 정책" onError="continue" {
  print "continue 예제 시작"
  math add a=missingVar b=1 -> broken
  print "continue 예제 끝"
}

step id="retryExample" desc="retry 정책" onError="retry=2" -> retryResult {
  print "retry 예제, 현재 카운터 =" retryCounter
  if retryCounter < 1 {
    set retryCounter = retryCounter + 1
    math add a=missingVar b=1 -> broken
  }
  math add a=retryCounter b=10 -> ok
  return attempts=retryCounter result=ok
}

step id="jumpExample" desc="jump 정책" onError="jump='recovery'" {
  print "jump 예제 시작"
  math add a=missingVar b=1 -> broken
}

step id="recovery" desc="점프 대상" -> recoveryResult {
  print "recovery step 실행"
  return message="jump 처리 완료"
}

step id="summary" desc="결과 요약" {
  print "retry 결과:" retryResult
  print "recovery 결과:" recoveryResult
}
`;

try {
  const ctx = await runQplan(script);
  console.log(ctx.toJSON());
} catch (err) {
  console.error("스크립트 실행 중 에러:", err?.message ?? err);
}
