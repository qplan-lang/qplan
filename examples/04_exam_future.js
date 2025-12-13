import { runQplan } from "../dist/index.js";

/**
 * Future example: delay tasks and log completion
 */
const script = `
future task="A" delay=3000 value="task-1" -> f1
future task="B" delay=5000 value="task-2" -> f2
echo msg="started futures" -> ok
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
