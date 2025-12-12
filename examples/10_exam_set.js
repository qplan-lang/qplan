import { runQplan } from "../dist/index.js";

/**
 * 예제: set 문으로 기존 변수 업데이트
 */
const script = `
var 0 -> count
var [1,2,3,4] -> nums

each n in nums {
  set count = count + n
}

set count = (count + 10) / 2
print count
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
