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

function testParamsMetaInPlanBlock() {
  const script = `
plan {
  @params "keyword,item"
  step id="ddd" {
    print keyword
    print item.aaa
  }
}
`;
  const result = validateQplanScript(script);
  assert.strictEqual(result.ok, true, "@params in plan meta should allow variable usage");
  assert.strictEqual(result.ast?.planMeta?.params, "keyword,item");
}

function testParamsMetaAtTopLevel() {
  const script = `
@params "keyword"
step id="ddd" {
  print keyword
}
`;
  const result = validateQplanScript(script);
  assert.strictEqual(result.ok, true, "Top-level @params should allow variable usage");
  assert.strictEqual(result.ast?.planMeta?.params, "keyword");
}

function testPlanMetaWithoutQuotes() {
  const script = `
@title My Awesome Plan
@summary 간단 설명
step id="ddd" {
  print "ok"
}
`;
  const result = validateQplanScript(script);
  assert.strictEqual(result.ok, true, "Unquoted plan meta should be accepted");
  assert.strictEqual(result.ast?.planMeta?.title, "My Awesome Plan");
  assert.strictEqual(result.ast?.planMeta?.summary, "간단 설명");
}

function testInvalidParamsMeta() {
  const script = `
@params keyword, bad-name
step id="ddd" {
  print keyword
}
`;
  const result = validateQplanScript(script);
  assert.strictEqual(result.ok, false, "Invalid @params identifiers should fail validation");
  const message = result.issues?.[0]?.message ?? "";
  assert.ok(message.includes("@params"), "Error should mention @params");
}

testValidScript();
testDuplicateStepId();
testMissingJumpTarget();
testUndefinedVariableUsage();
testStepIdReference();
testParamsMetaInPlanBlock();
testParamsMetaAtTopLevel();
testPlanMetaWithoutQuotes();
testInvalidParamsMeta();
console.log("runtime validate-tests passed");
