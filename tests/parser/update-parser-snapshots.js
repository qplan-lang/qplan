import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { tokenize } from "../../dist/core/tokenizer.js";
import { Parser } from "../../dist/core/parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(dirname(__dirname));
const SNAPSHOT_DIR = join(__dirname, "__snapshots__");

function normalizeAst(ast) {
  if (Array.isArray(ast)) return ast.map(normalizeAst);
  if (ast && typeof ast === "object") {
    const result = {};
    for (const [key, value] of Object.entries(ast)) {
      if (key === "line") continue;
      result[key] = normalizeAst(value);
    }
    return result;
  }
  return ast;
}

async function ensureSnapshotDir() {
  if (!existsSync(SNAPSHOT_DIR)) {
    await mkdir(SNAPSHOT_DIR, { recursive: true });
  }
}

async function extractScript(jsFile) {
  const text = await readFile(jsFile, "utf8");
  const match = text.match(/const script = `([\s\S]*?)`;/);
  if (!match) {
    throw new Error(`Cannot find script literal in ${jsFile}`);
  }
  return match[1];
}

async function updateSnapshot(name, source) {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const normalized = normalizeAst(ast);
  const snapshotPath = join(SNAPSHOT_DIR, `${name}.json`);
  await writeFile(snapshotPath, JSON.stringify(normalized, null, 2));
  console.log(`Updated snapshot: ${snapshotPath}`);
}

async function main() {
  await ensureSnapshotDir();

  // validator sample (raw qplan file)
  const validatorSource = await readFile(join(rootDir, "examples/validator_sample.qplan"), "utf8");
  await updateSnapshot("validator_sample", validatorSource);

  const jsExamples = [
    { name: "step_basic", file: "examples/12_exam_step.js" },
    { name: "step_events", file: "examples/13_exam_step_events.js" },
    { name: "step_substep", file: "examples/14_exam_substep.js" },
    { name: "step_error", file: "examples/15_exam_step_error.js" },
  ];

  for (const example of jsExamples) {
    const script = await extractScript(join(rootDir, example.file));
    await updateSnapshot(example.name, script);
  }

  const extraQplans = [
    { name: "dot_access", file: "tests/parser/dot_access.qplan" }
  ];

  for (const extra of extraQplans) {
    const source = await readFile(join(rootDir, extra.file), "utf8");
    await updateSnapshot(extra.name, source);
  }
}

main().catch(err => {
  console.error("update-parser-snapshots failed:", err);
  process.exit(1);
});
