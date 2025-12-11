import { runQplan } from "../dist/index.js";

/**
 * 예제: print 모듈 사용법
 */
const script = `
file read path="./examples/print_user.json" -> userStr
json parse data=userStr -> user
print "basic" 1 2
print label="kv example" 3 4
print "user" user user
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
