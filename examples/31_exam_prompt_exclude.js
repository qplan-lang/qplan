import { buildAIPlanPrompt, registry, runQplan } from "../dist/index.js";

/**
 * Example: excludeInPrompt hides modules from prompt builders
 */
registry.register({
  id: "visible_echo",
  description: "visible in prompt",
  inputs: ["msg"],
  usage: `visible_echo msg="hello" -> out`,
  execute: ({ msg }) => ({ msg }),
});

registry.register({
  id: "internal_echo",
  description: "hidden from prompt",
  inputs: ["msg"],
  usage: `internal_echo msg="secret" -> out`,
  excludeInPrompt: true,
  execute: ({ msg }) => ({ msg }),
});

const prompt = buildAIPlanPrompt("say hello", { registry });
console.log(prompt);

const script = `
step id="use_hidden" {
  internal_echo msg="still usable at runtime" -> result
}
`;

const ctx = await runQplan(script, { registry });
console.log(ctx.toJSON());
