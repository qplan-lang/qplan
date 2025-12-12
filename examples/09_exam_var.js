import { runQplan } from "../dist/index.js";

/**
 * 예제: var 모듈로 리터럴 값을 ctx에 저장
 */
const script = `
var 0 -> count
var "hello" -> msg
var [1,2,3] -> items
var {"name":"qplan","enabled":true} -> config

print count
print msg
print items
print config
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
