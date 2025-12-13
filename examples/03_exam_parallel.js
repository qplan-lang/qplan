import { runQplan } from "../dist/index.js";

/**
 * Example: simple parallel block with concurrency control
 */
const script = `
parallel concurrency=3 {
    sleep ms=3000 -> a
    sleep ms=1000 -> b
    sleep ms=5000 -> c
}

echo msg="parallel done" -> done
`;

const ctx = await runQplan(script);
const state = ctx.toJSON();
console.log(state);
console.log("a:", state.a);
console.log("b:", state.b);
console.log("c:", state.c);
