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

function testUndefinedVariableUsage() {
  const script = `
step id="broken" {
  math add a=missingVar b=1 -> result
}
`;
  const result = validateQplanScript(script);
  assert.strictEqual(result.ok, false, "Referencing undefined ctx variables should fail validation");
  const message = result.issues?.[0]?.message ?? "";
  assert.ok(message.includes("missingVar"), "Error message should mention the missing variable");
}

function testStepIdReference() {
  const script = `
step id="prepare" {
  var 1 -> value
}

step id="calc" {
  math add a=prepare.value b=1 -> total
}
`;
  const result = validateQplanScript(script);
  assert.strictEqual(result.ok, true, "Referencing previous step output should be valid");
}

testValidScript();
testDuplicateStepId();
testMissingJumpTarget();
testUndefinedVariableUsage();
testStepIdReference();
console.log("runtime validate-tests passed");
