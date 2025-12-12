import { runQplan } from "../dist/index.js";

/**
 * 예제: Step + jump + onError + output
 */
const script = `
step id="init" desc="변수 초기화" -> initResult {
  var 0 -> total
  var [1,2,3] -> nums
  print "init done"
  return tot=total nums=nums
}

step id="loop" desc="합산 루프" onError="retry=2" -> loopResult {
  print "loop start"
  each (item, idx) in nums {
    math add a=total b=item -> total
  }
  print "loop end" total
  math add a=total b=0 -> sumSnapshot
}

step id="branch" desc="조건 분기" {
  if total <= 6 {
    jump to="loop"
  }
  print "계속 진행"
}

step id="cleanup" desc="마무리" -> finalResult {
  print "=== 마무리 ==="
  print "total:" total
  print "initResult:" initResult
  print "loopResult:" loopResult
  return total=total init=initResult loop=loopResult
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
