import { runQplan } from "../dist/index.js";

/**
 * 예제: while 반복문
 */
const script = `
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
    skip
  }
  if idx == 4 {
    stop
  }
  print idx
  set idx = idx + 1
}

print "-------------------"
print count
print idx
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
