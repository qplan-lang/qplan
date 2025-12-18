import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";

type PrintEntry =
  | { kind: "literal"; value: any }
  | { kind: "identifier"; name: string }
  | { kind: "kv"; key: string; value: any; refName?: string };

const resolveInput = (value: any, ctx: ExecutionContext) => {
  if (typeof value === "string" && ctx.has(value)) {
    return ctx.get(value);
  }
  return value;
};

const stringifyIfObject = (value: any) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value;
};

const normalizeEntries = (inputs: Record<string, any>): PrintEntry[] => {
  const entries: PrintEntry[] = [];
  for (const [key, value] of Object.entries(inputs)) {
    if (key.startsWith("__")) continue;
    entries.push({ kind: "kv", key, value });
  }
  return entries;
};

export const printModule: ActionModule = Object.assign(
  (inputs: Record<string, any>, ctx: ExecutionContext) => {
    const rawEntries = Array.isArray(inputs.__entries)
      ? (inputs.__entries as PrintEntry[])
      : normalizeEntries(inputs);

    const consoleArgs: any[] = rawEntries.map(entry => {
      switch (entry.kind) {
        case "literal":
          return entry.value;
        case "identifier": {
          const resolved = ctx.has(entry.name) ? ctx.get(entry.name) : entry.name;
          return stringifyIfObject(resolved);
        }
        case "kv": {
          const obj: Record<string, any> = {};
          obj[entry.key] = resolveInput(entry.value, ctx);
          return obj;
        }
        default:
          return undefined;
      }
    });

    console.log(...consoleArgs);
    return consoleArgs.length ? consoleArgs[consoleArgs.length - 1] : undefined;
  },
  {
    id: "print",
    description: "console.log 스타일 출력. 문자열/숫자/ctx 변수/키-값을 혼합해 출력.",
    usage: `
print "hello", 1, 2
print user
print name="kim", 1, 2
`,
    inputs: ["...values"],
  }
);
