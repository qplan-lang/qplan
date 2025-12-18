import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

import { tokenize } from "../../dist/core/tokenizer.js";
import { Parser } from "../../dist/core/parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(dirname(__dirname));

const SNAPSHOT_DIR = join(__dirname, "__snapshots__");

const SCRIPT_LITERAL = /const script = `([\s\S]*?)`;/;

async function loadScript(file, fallback) {
  // JS example files embed the QPlan script inside a template literal. Extract it for parsing.
  if (extname(file) === ".js") {
    const content = await readFile(file, "utf8");
    const match = content.match(SCRIPT_LITERAL);
    if (match) {
      return match[1];
    }
    if (fallback) {
      return await readFile(fallback, "utf8");
    }
    throw new Error(`Unable to extract embedded script from ${file}`);
  }

  try {
    return await readFile(file, "utf8");
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT" && fallback) {
      return await readFile(fallback, "utf8");
    }
    throw err;
  }
}

async function loadJson(path) {
  try {
    const data = await readFile(path, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

function normalizeAst(ast) {
  if (Array.isArray(ast)) {
    return ast.map(normalizeAst);
  }
  if (ast && typeof ast === "object") {
    const result = {};
    for (const [key, value] of Object.entries(ast)) {
      if (key === "line" || key === "argRefs") continue;
      result[key] = normalizeAst(value);
    }
    return result;
  }
  return ast;
}

const TEST_CASES = [
  { name: "validator_sample", file: "examples/validator_sample.qplan" },
  {
    name: "step_basic",
    file: "examples/12_exam_step.js",
    fallback: join(SNAPSHOT_DIR, "step_basic_input.qplan"),
  },
  {
    name: "step_events",
    file: "examples/13_exam_step_events.js",
    fallback: join(SNAPSHOT_DIR, "step_events_input.qplan"),
  },
  {
    name: "step_substep",
    file: "examples/14_exam_substep.js",
    fallback: join(SNAPSHOT_DIR, "step_substep_input.qplan"),
  },
  {
    name: "step_error",
    file: "examples/15_exam_step_error.js",
    fallback: join(SNAPSHOT_DIR, "step_error_input.qplan"),
  },
  {
    name: "dot_access",
    file: "tests/parser/dot_access.qplan",
  },
  {
    name: "unicode_identifiers",
    file: "tests/parser/unicode_identifiers.qplan",
  },
];

async function runTestCase(test) {
  const scriptPath = join(rootDir, test.file);
  const source = await loadScript(scriptPath, test.fallback);

  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const normalized = normalizeAst(ast);

  const snapshotPath = join(SNAPSHOT_DIR, `${test.name}.json`);
  const expected = await loadJson(snapshotPath);
  if (!expected) {
    throw new Error(`Snapshot missing for ${test.name}. Create ${snapshotPath}.`);
  }

  const actualJson = JSON.stringify(normalized, null, 2);
  const expectedJson = JSON.stringify(expected, null, 2);
  if (actualJson !== expectedJson) {
    throw new Error(`Snapshot mismatch for ${test.name}`);
  }
}

async function main() {
  const results = { passed: 0, failed: 0 };
  for (const test of TEST_CASES) {
    try {
      await runTestCase(test);
      results.passed++;
      console.log(`✅ ${test.name}`);
    } catch (err) {
      results.failed++;
      console.error(`❌ ${test.name}:`, err instanceof Error ? err.message : err);
    }
  }
  if (results.failed > 0) {
    process.exitCode = 1;
    console.error(`Parser tests failed: ${results.failed} case(s)`);
  } else {
    console.log("All parser tests passed");
  }
}

main().catch(err => {
  console.error("parser-tests crashed:", err);
  process.exit(1);
});
