import { runQplan } from "../dist/index.js";

/**
 * 예제: if 조건문 (기본 → 다중 조건 → 괄호 조합)
 */
const script = `
math add a=40 b=15 -> total
math add a=2 b=2 -> count
json parse data="null" -> nothing

# 1) 기본 비교
if total > 50 {
  echo msg="total > 50" -> msg1
} else {
  echo msg="total <= 50" -> msg1
}

# 2) AND / OR / NOT 조합
if total > 30 and not count > 3 {
  echo msg="complex true" -> msg2
} else {
  echo msg="complex false" -> msg2
}

# 3) 괄호로 우선순위 제어
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
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
