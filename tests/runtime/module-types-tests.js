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

testModuleTypeMetadataInPrompt();
console.log("runtime module-types-tests passed");
