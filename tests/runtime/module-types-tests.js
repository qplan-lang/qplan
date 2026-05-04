import assert from "node:assert";
import { buildAIPlanPrompt } from "../../dist/index.js";
import { ModuleRegistry } from "../../dist/core/moduleRegistry.js";
import { buildQplanSuperPrompt } from "../../dist/core/buildQplanSuperPrompt.js";

function testModuleTypeMetadataInPrompt() {
  const registry = new ModuleRegistry({ seedBasicModules: false });
  registry.register({
    id: "profile",
    description: "build a profile object",
    inputs: ["name", "age"],
    inputType: { name: "string", age: "number" },
    outputType: {
      title_a: "string",
      gndType: "number",
      arr: { obj1: "any", obj2: "any" },
    },
    execute: () => ({ title_a: "ok", gndType: 1, arr: { obj1: {}, obj2: {} } }),
  });

  const planPrompt = buildAIPlanPrompt("create a profile", { registry });
  assert.ok(planPrompt.includes("입력타입: {\"name\":\"string\",\"age\":\"number\"}"));
  assert.ok(
    planPrompt.includes(
      "출력타입: {\"title_a\":\"string\",\"gndType\":\"number\",\"arr\":{\"obj1\":\"any\",\"obj2\":\"any\"}}"
    )
  );

  const superPrompt = buildQplanSuperPrompt(registry);
  assert.ok(superPrompt.includes("입력타입: {\"name\":\"string\",\"age\":\"number\"}"));
  assert.ok(
    superPrompt.includes(
      "출력타입: {\"title_a\":\"string\",\"gndType\":\"number\",\"arr\":{\"obj1\":\"any\",\"obj2\":\"any\"}}"
    )
  );
}

function testExcludeInPrompt() {
  const registry = new ModuleRegistry({ seedBasicModules: false });
  registry.register({
    id: "visible_echo",
    description: "visible in prompt",
    inputs: ["msg"],
    execute: () => ({ ok: true }),
  });
  registry.register({
    id: "internal_echo",
    description: "hidden from prompt",
    inputs: ["msg"],
    excludeInPrompt: true,
    execute: () => ({ ok: true }),
  });

  const planPrompt = buildAIPlanPrompt("say hello", { registry });
  assert.ok(planPrompt.includes("- visible_echo: visible in prompt"));
  assert.ok(!planPrompt.includes("internal_echo"));

  const superPrompt = buildQplanSuperPrompt(registry);
  assert.ok(superPrompt.includes("- visible_echo: visible in prompt"));
  assert.ok(!superPrompt.includes("internal_echo"));
}

function testPromptModuleFilter() {
  const registry = new ModuleRegistry({ seedBasicModules: false });
  registry.register({
    id: "http_get",
    title: "HTTP request",
    category: "network",
    tags: ["http", "api"],
    description: "Fetch text from an API",
    usage: `http_get url="https://example.com" -> out`,
    inputs: ["url"],
    execute: () => ({ ok: true }),
  });
  registry.register({
    id: "json_parse",
    category: "data",
    tags: ["json"],
    description: "Parse JSON text",
    inputs: ["data"],
    execute: () => ({ ok: true }),
  });

  const planPrompt = buildAIPlanPrompt("fetch remote data", {
    registry,
    moduleFilter: { category: "network", limit: 5 },
  });
  assert.ok(planPrompt.includes("- http_get (HTTP request): Fetch text from an API"));
  assert.ok(planPrompt.includes("입력값: url"));
  assert.ok(!planPrompt.includes("category: network"));
  assert.ok(!planPrompt.includes("tags: http, api"));
  assert.ok(!planPrompt.includes("http_get url=\"https://example.com\" -> out"));
  assert.ok(!planPrompt.includes("json_parse"));

  const fullPrompt = buildAIPlanPrompt("fetch remote data", {
    registry,
    moduleFilter: { category: "network", limit: 5 },
    moduleDetail: "full",
  });
  assert.ok(fullPrompt.includes("category: network"));
  assert.ok(fullPrompt.includes("tags: http, api"));
  assert.ok(fullPrompt.includes("http_get url=\"https://example.com\" -> out"));
}

function testPromptModuleDetailModes() {
  const registry = new ModuleRegistry({ seedBasicModules: false });
  registry.register({
    id: "tiny",
    title: "Tiny module",
    description: "short description",
    inputs: ["value"],
    inputType: { value: "string" },
    usage: `tiny value="hello" -> out`,
    execute: () => ({ ok: true }),
  });

  const idsPrompt = buildAIPlanPrompt("use tiny", {
    registry,
    moduleDetail: "ids",
  });
  assert.ok(idsPrompt.includes("- tiny (Tiny module)"));
  assert.ok(!idsPrompt.includes("short description"));
  assert.ok(!idsPrompt.includes("입력값: value"));

  const usagePrompt = buildAIPlanPrompt("use tiny", {
    registry,
    moduleDetail: "usage",
  });
  assert.ok(usagePrompt.includes("short description"));
  assert.ok(usagePrompt.includes("입력값: value"));
  assert.ok(usagePrompt.includes("tiny value=\"hello\" -> out"));
}

testModuleTypeMetadataInPrompt();
testExcludeInPrompt();
testPromptModuleFilter();
testPromptModuleDetailModes();
console.log("runtime module-types-tests passed");
