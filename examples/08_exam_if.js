import { runQplan } from "../dist/index.js";

/**
 * Example: if statements (basic → complex → parentheses)
 */
const script = `
math add a=40 b=15 -> total
math add a=2 b=2 -> count
json parse data="null" -> nothing

# 1) Basic comparison
if total > 50 {
  echo msg="total > 50" -> msg1
} else {
  echo msg="total <= 50" -> msg1
}

# 2) AND / OR / NOT combinations
if total > 30 and not count > 3 {
  echo msg="complex true" -> msg2
} else {
  echo msg="complex false" -> msg2
}

# 3) Parentheses for precedence
if (total > 60 and count > 3) or (total > 50 and count == 4) {
  echo msg="bracket true" -> msg3
} else {
  echo msg="bracket false" -> msg3
}

# 4) EXISTS / NOT_EXISTS
if value EXISTS dummy or nothing NOT_EXISTS dummy2 {
  echo msg="exists branch" -> msg4
} else {
  echo msg="not exists" -> msg4
}

# 5) Boolean Literals (true/false)
var true -> isRun
var false -> isStop

if isRun == true {
  echo msg="isRun is true" -> msg5_1
}
if isStop == false {
  echo msg="isStop is false" -> msg5_2
}
if isRun == false {
  echo msg="should not run" -> msg5_3
} else {
  echo msg="false check ok" -> msg5_3
}
if isStop != true {
  echo msg="not true check ok" -> msg5_4
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
