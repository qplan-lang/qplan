import assert from "node:assert";
import { validateQplanScript } from "../../dist/index.js";

function testValidScript() {
  const script = `
step id="greet" desc="Print hello" {
  print "hello"
}
`;
  const result = validateQplanScript(script);
  assert.strictEqual(result.ok, true, "Expected script to be valid");
  assert.ok(result.ast, "Valid result should include AST");
}

function testDuplicateStepId() {
  const script = `
step id="dup" { print "a" }
step id="dup" { print "b" }
`;
  const result = validateQplanScript(script);
  assert.strictEqual(result.ok, false, "Duplicate step IDs should fail validation");
  assert.ok(
    result.issues && result.issues.length > 0,
    "Duplicate step should produce semantic issues"
  );
  const message = result.issues?.[0]?.message ?? "";
  assert.ok(message.toLowerCase().includes("duplicate"), "Error message should mention duplicate");
}

function testMissingJumpTarget() {
  const script = `
step id="start" {
  jump to="missing"
}
`;
  const result = validateQplanScript(script);
  assert.strictEqual(result.ok, false, "Jump to missing step should fail validation");
  assert.ok(result.issues && result.issues.length > 0, "Should report missing jump target");
}

testValidScript();
testDuplicateStepId();
testMissingJumpTarget();
console.log("runtime validate-tests passed");
