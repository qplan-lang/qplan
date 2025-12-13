import { runQplan } from "../dist/index.js";

/**
 * Example: collection of each-loop patterns
 */
const script = `
json parse data="[1,2,3,4]" -> nums

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

# Use skip (ignore value 3)
math add a=0 b=0 -> skipTotal
each value in nums {
  if value == 3 {
    skip
  }
  print "value:" value "skip no"
  math add a=skipTotal b=value -> skipTotal
}

print "------------"

# Use stop (halt when value hits 3)
math add a=0 b=0 -> stopTotal
each value in nums {
  if value == 3 {
    print "value:" value "stop yes"
    stop
  }
  print "value:" value "stop no"
  math add a=stopTotal b=value -> stopTotal
}

print "- END of each state"
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
