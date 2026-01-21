import { runQplan } from "../dist/index.js";

/**
 * Example: collection of each-loop patterns
 * - break: exit loop
 * - continue: skip to next iteration
 */
const script = `
step id="each_test" {
  json parse data="[1,2,3,4]" -> nums

  print "--- array.length is same array.count ---"
  print "length:" nums.length
  print "count:" nums.count
  print "------------"

  # Basic each — sum every value
  math add a=0 b=0 -> basicTotal
  each value in nums {
    math add a=basicTotal b=value -> basicTotal
    print value
  }

  print "------------"

  # Track item and index separately
  math add a=0 b=0 -> indexTotal
  each (value, idx) in nums {
    math add a=indexTotal b=idx -> indexTotal
    print "value:" value ", idx:" idx
  }

  print "------------"

  # Use continue (ignore value 3)
  math add a=0 b=0 -> skipTotal
  each value in nums {
    if value == 3 {
      continue
    }
    print "value:" value "continue no"
    math add a=skipTotal b=value -> skipTotal
  }

  print "------------"

  # Use break (halt when value hits 3)
  math add a=0 b=0 -> stopTotal
  each value in nums {
    if value == 3 {
      print "value:" value "break yes"
      break
    }
    print "value:" value "break no"
    math add a=stopTotal b=value -> stopTotal
  }

  print "- END of each state"
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
