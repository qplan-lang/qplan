// src/modules/basic/string.ts
import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";

/**
 * string 모듈
 * -----------------------------------------
 * 지원 op:
 *  - lower, upper, trim
 *  - replace (search, replace)
 *  - split (sep)
 *  - join (arr, sep)
 *  - includes (search)
 *  - length
 *  - substring (start, end)
 */
export const stringModule: ActionModule = {
  id: "string",
  description: "문자열 처리(lower/upper/trim/replace/split/join/includes/length/substring).",
  usage: `
string lower     text="ABC" -> out
string upper     text="abc" -> out
string trim      text="  hi  " -> out

string replace   text="a-b-c" search="-" replace=":" -> out
string split     text="a,b,c" sep="," -> out
string join      arr="[1,2,3]" sep="-" -> out

string includes  text="hello" search="ell" -> out
string length    text="hello" -> out

string op="substring" text="abcdef" start=1 end=4 -> out
  `.trim(),
  inputs: [
    "op",
    "text",
    "search",
    "replace",
    "sep",
    "arr",
    "start",
    "end"
  ],

  execute(inputs: Record<string, any>, ctx: ExecutionContext) {
    const op = String(inputs.op ?? "");
    let text = inputs.text;

    if (typeof text === "string" && ctx.has(text)) {
      text = ctx.get(text);
    }

    text = String(text ?? "");

    switch (op) {
      case "lower":
        return text.toLowerCase();

      case "upper":
        return text.toUpperCase();

      case "trim":
        return text.trim();

      case "replace":
        return text.replace(
          String(inputs.search ?? ""),
          String(inputs.replace ?? "")
        );

      case "split":
        return text.split(String(inputs.sep ?? ","));

      case "join":
        if (!Array.isArray(inputs.arr)) {
          try {
            const arr = JSON.parse(String(inputs.arr));
            return arr.join(String(inputs.sep ?? ","));
          } catch {
            throw new Error("string.join requires array input");
          }
        }
        return inputs.arr.join(String(inputs.sep ?? ","));

      case "includes":
        return text.includes(String(inputs.search ?? ""));

      case "length":
        return text.length;

      case "substring":
        return text.substring(
          Number(inputs.start ?? 0),
          inputs.end !== undefined ? Number(inputs.end) : undefined
        );

      default:
        throw new Error(`Unknown string op: ${op}`);
    }
  }
};
