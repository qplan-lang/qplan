import { runQplan } from "../dist/index.js";

/**
 * Example: simple echo input
 */
const script = `
echo msg="hello world" -> out
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
