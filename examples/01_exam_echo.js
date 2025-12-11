import { runQplan } from "../dist/index.js";

/**
 * 예제: 입력 echo
 */
const script = `
echo msg="hello world" -> out
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
