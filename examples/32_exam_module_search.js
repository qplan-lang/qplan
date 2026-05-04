import { buildAIPlanPrompt, registry, runQplan } from "../dist/index.js";

/**
 * Example: search modules and pass only filtered modules to prompt builders
 */
registry.register({
  id: "api_fetch",
  title: "API fetch",
  category: "network",
  tags: ["http", "api", "fetch"],
  aliases: ["request", "download"],
  description: "Fetch text from a remote API URL.",
  usage: `api_fetch url="https://example.com" -> text`,
  inputs: ["url"],
  execute: async ({ url }) => `mock response from ${url}`,
});

registry.register({
  id: "json_pick",
  title: "JSON pick",
  category: "data",
  tags: ["json", "parse", "path"],
  aliases: ["json get", "object path"],
  description: "Parse JSON text and return a top-level field.",
  usage: `json_pick data="{\\"name\\":\\"kim\\"}" key="name" -> name`,
  inputs: ["data", "key"],
  execute: ({ data, key }) => {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return parsed?.[key];
  },
});

registry.register({
  id: "internal_admin_api",
  title: "Internal admin API",
  category: "network",
  tags: ["http", "admin", "internal"],
  description: "Internal module that should not be exposed to dynamic planning.",
  usage: `internal_admin_api op="reset" -> out`,
  inputs: ["op"],
  excludeInPrompt: true,
  execute: ({ op }) => ({ ok: true, op }),
});

const searchedModules = registry.search({
  categories: ["network", "data"],
  tags: ["http", "json"],
  query: "api json",
  limit: 10,
});

console.log("Search results:");
console.log(searchedModules.map(module => module.id));

const prompt = buildAIPlanPrompt("Fetch API data and pick a JSON field", {
  registry,
  moduleFilter: {
    categories: ["network", "data"],
    tags: ["http", "json"],
    query: "api json",
    limit: 10,
  },
});

console.log("\nFiltered prompt:");
console.log(prompt);
console.log("\nHidden module included in prompt:", prompt.includes("internal_admin_api"));

const script = `
step id="use_hidden_runtime_module" {
  internal_admin_api op="healthcheck" -> result
}
`;

const ctx = await runQplan(script, { registry });
console.log("\nRuntime can still execute hidden modules:");
console.log(ctx.toJSON());
