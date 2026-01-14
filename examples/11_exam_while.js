import { runQplan } from "../dist/index.js";

/**
 * Example: while loop patterns
 * - break: exit loop
 * - continue: skip to next iteration
 */
const script = `
step id="while_test" {
  var 0 -> count

  while count < 5 {
    print count
    set count = count + 1
  }
  print "-------------------"

  var 0 -> idx
  while idx < count {
    if idx == 2 {
      set idx = idx + 1
      continue
    }
    if idx == 4 {
      break
    }
    print idx
    set idx = idx + 1
  }

  print "-------------------"
  print count
  print idx
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
