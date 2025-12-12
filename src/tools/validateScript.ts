import { readFile } from "node:fs/promises";
import process from "node:process";
import { validateQplanScript } from "../index.js";

const usage = `Usage:
  npm run validate -- <script-file>
  npm run validate -- -    # read from stdin`;

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error(usage);
    process.exit(1);
  }

  const target = args[0];
  const script = target === "-" ? await readStdin() : await readFile(target, "utf8");
  const result = validateQplanScript(script);

  if (result.ok) {
    console.log(`✅ Valid qplan script (${target === "-" ? "stdin" : target})`);
    return;
  }

  console.error(`❌ Invalid qplan script (${target === "-" ? "stdin" : target})`);
  if (result.line !== undefined) {
    console.error(` line ${result.line}`);
  }
  console.error(` ${result.error}`);
  if (result.issues?.length) {
    console.error(" Details:");
    for (const issue of result.issues) {
      const prefix = issue.line !== undefined ? `  - line ${issue.line}:` : "  -";
      console.error(`${prefix} ${issue.message}`);
    }
  }
  process.exit(1);
}

async function readStdin(): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

main().catch(err => {
  console.error("Failed to validate script:", err);
  process.exit(1);
});
