import { runQplan } from "../dist/index.js";

/**
 * Example: read numbers, compute average, branch on result
 */
const script = `
file read path="./examples/nums.txt" -> raw
math op="avg" arr=raw -> avg

if avg > 50 {
    echo msg="HIGH" -> result
} else {
    echo msg="LOW" -> result
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
