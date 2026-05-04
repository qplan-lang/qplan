import assert from "node:assert";
import { ModuleRegistry } from "../../dist/core/moduleRegistry.js";

function createModule(id) {
  return {
    id,
    async execute() {
      return "ok";
    },
  };
}

function createSearchModule(id, meta = {}) {
  return {
    id,
    ...meta,
    async execute() {
      return "ok";
    },
  };
}

function testValidId() {
  const registry = new ModuleRegistry({ seedBasicModules: false });
  registry.register(createModule("alpha_beta123"));
  assert.ok(true, "Valid module ids should register successfully");
}

function testInvalidId() {
  const registry = new ModuleRegistry({ seedBasicModules: false });
  assert.throws(
    () => registry.register(createModule("bad:id")),
    /Invalid module id/,
    "Module ids containing ':' should be rejected"
  );
  assert.throws(
    () => registry.register(createModule("dash-id")),
    /Invalid module id/,
    "Module ids containing '-' should be rejected"
  );
}

function testSearchAndFilter() {
  const registry = new ModuleRegistry({ seedBasicModules: false });
  registry.register(createSearchModule("http_get", {
    title: "HTTP request",
    category: "network",
    tags: ["http", "api"],
    aliases: ["fetch"],
    description: "Fetch text from an API",
    usage: `http_get url="https://example.com" -> out`,
  }));
  registry.register(createSearchModule("json_parse", {
    category: "data",
    tags: ["json", "parse"],
    description: "Parse JSON text",
  }));
  registry.register(createSearchModule("internal_secret", {
    category: "network",
    tags: ["http"],
    description: "Hidden internal API",
    excludeInPrompt: true,
  }));

  assert.deepStrictEqual(
    registry.search({ category: "network" }).map(m => m.id),
    ["http_get"]
  );
  assert.deepStrictEqual(
    registry.search({ tags: ["json"] }).map(m => m.id),
    ["json_parse"]
  );
  assert.deepStrictEqual(
    registry.search({ query: "fetch api" }).map(m => m.id),
    ["http_get"]
  );
  assert.deepStrictEqual(
    registry.list({ includeExcluded: true, query: "hidden" }).map(m => m.id),
    ["internal_secret"]
  );
  assert.deepStrictEqual(
    registry.listCategories(),
    [
      { category: "data", count: 1 },
      { category: "network", count: 1 },
    ]
  );
}

testValidId();
testInvalidId();
testSearchAndFilter();
console.log("runtime module-registry-tests passed");
