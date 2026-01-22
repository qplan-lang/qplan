import { buildAIPlanPrompt, registry, runQplan } from "../dist/index.js";

/**
 * Example: module inputType/outputType metadata
 */
registry.register({
  id: "profile",
  description: "build a simple profile object",
  inputs: ["name", "age"],
  inputType: { name: "string", age: "number" },
  outputType: {
    title_a: "string",
    gndType: "number",
    arr: [{ obj1: "any", obj2: "any" }],
  },
  execute: ({ name, age }) => ({
    title_a: name,
    gndType: age,
    arr: [{ obj1: { ok: true }, obj2: { ok: false } }],
  }),
});

registry.register({
  id: "list_profiles",
  description: "return a list of profile objects",
  inputs: ["names"],
  inputType: { names: ["string"] },
  outputType: [
    {
      title_a: "string",
      gndType: "number",
      arr: [{ obj1: "any", obj2: "any" }],
    },
  ],
  execute: ({ names }) =>
    (names ?? []).map((name, index) => ({
      title_a: name,
      gndType: index,
      arr: [{ obj1: { ok: true }, obj2: { ok: false } }],
    })),
});

const prompt = buildAIPlanPrompt("create a profile", { registry });
console.log(prompt);

const script = `
step id="build_profile" {
  profile name="sdfsdf" age=3 -> result
}

step id="build_profiles" {
  list_profiles names=["a","b"] -> list
}
`;

const ctx = await runQplan(script, { registry });
console.log(ctx.toJSON());
