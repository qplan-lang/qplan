import { runQplan } from "../dist/index.js";

/**
 * Example: Step + jump + onError + output handling
 */
const script = `
step id="init" desc="Initialize variables" -> initResult {
  var 0 -> total
  var [1,2,3] -> nums
  print "init done"
  return tot=total nums=nums
}

step id="loop" desc="Sum loop" onError="retry=2" -> loopResult {
  print "loop start"
  each (item, idx) in nums {
    math add a=total b=item -> total
  }
  print "loop end" total
  math add a=total b=0 -> sumSnapshot
}

step id="branch" desc="Conditional branch" {
  if total <= 6 {
    jump to="loop"
  }
  print "continue"
}

step id="cleanup" desc="Finalize" -> finalResult {
  print "=== finalize ==="
  print "total:" total
  print "initResult:" initResult
  print "loopResult:" loopResult
  return total=total init=initResult loop=loopResult
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
