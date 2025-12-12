import { runQplan } from "../dist/index.js";

/**
 * 예제: Step 안에 Sub-step을 중첩해 사용하는 패턴
 */
const script = `
step id="pipeline" desc="루트 파이프라인" -> pipelineResult {
  var {"numbers": []} -> prepareResult
  var {"sum": 0} -> aggregateResult
  var {"message": "pending"} -> reportResult
  var {"status": "pending"} -> finalizeResult
  var 0 -> total

  step id="prepare" desc="데이터 준비" -> prepareResult {
    var [1,2] -> numbers
    set total = 0
    return numbers=numbers
  }

  step id="aggregate" desc="합계 계산" -> aggregateResult {
    each n in numbers {
      math add a=total b=n -> total
      if total > 6 {
        math add a=total b=0 -> partial
        return sum=partial
      }
    }
    return sum=total
  }

  step id="validate" desc="검증/재시도" onError="continue" {
    if total < 6 {
      print "합계가 작아서 재시작"
      var [1,2,3,4] -> expanded
      set numbers = expanded
      set total = 0
      jump to="aggregate"
    }
  }

  step id="report" desc="리포트 작성" -> reportResult {
    print "총합:" total
    return message="완료"
  }

  step id="finalize" desc="최종 저장" -> finalizeResult {
    print "최종 합계:" total
    math add a=total b=0 -> finalTotal
    return status="ok" value=finalTotal
  }

  return prepared=prepareResult aggregate=aggregateResult report=reportResult finalize=finalizeResult
}

step id="final" desc="결과 출력" {
  print "파이프라인:" pipelineResult
  print "준비:" prepareResult
  print "합계:" aggregateResult
  print "리포트:" reportResult
}
`;

const ctx = await runQplan(script, {
  stepEvents: {
    async onStepStart(info) {
      console.log("▶ start:", info.desc ?? info.stepId, "-", info.path.join(" > "));
    },
    async onStepEnd(info, result) {
      console.log("✔ end:", info.desc ?? info.stepId, "result:", result);
    },
    async onStepError(info, error) {
      console.log("✖ error:", info.desc ?? info.stepId, error.message);
    },
    async onStepRetry(info, attempt, error) {
      console.log("↻ retry:", info.desc ?? info.stepId, "attempt", attempt, "-", error.message);
    },
    async onStepJump(info, targetStepId) {
      console.log("➜ jump:", info.desc ?? info.stepId, "→", targetStepId);
    },
  },
});
console.log(ctx.toJSON());
