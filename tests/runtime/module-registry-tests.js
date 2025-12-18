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

testValidId();
testInvalidId();
console.log("runtime module-registry-tests passed");
