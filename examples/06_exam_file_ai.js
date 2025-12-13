// Set OPENAI_API_KEY in your shell before running.
// e.g., PowerShell: $env:OPENAI_API_KEY="sk-..."

import { runQplan, registry } from "../dist/index.js";
import { aiModule } from "../dist/modules/basic/ai.js";

/**
 * Example: read a file and call the ai module
 */

// ai module is not part of the default bundle, so register it first.
registry.register(aiModule);

const script = `
file read path="./examples/math.txt" -> math_exam
ai prompt="Tell me only the correct answer to this math problem" context=math_exam -> answer
echo msg=answer -> out
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
