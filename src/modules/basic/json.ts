// src/modules/basic/json.ts
import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";

/**
 * json 모듈
 * -----------------------------------------
 * 지원 op:
 *  - parse
 *  - stringify
 *  - get (path)
 *  - set (path, value)
 *  - keys
 *  - values
 *  - entries
 */
export const jsonModule: ActionModule = {
  id: "json",
  description: "JSON 처리(parse/stringify/get/set/keys/values/entries).",
  usage: `
json op="parse"      data="{ \\"a\\":1 }" -> out
json op="stringify"  data=val space=2 -> out
json op="get"        data=val path="a.b.c" -> out
json op="set"        data=val path="a.b.c" value=123 -> out
json op="keys"       data=val -> out
json op="values"     data=val -> out
json op="entries"    data=val -> out
  `.trim(),
  inputs: [
    "op",
    "data",
    "path",
    "value",
    "space"
  ],

  execute(inputs: Record<string, any>, ctx: ExecutionContext) {
    const op = String(inputs.op ?? "");
    let val = inputs.data;

    // ctx 변수 지원
    if (typeof val === "string" && ctx.has(val)) {
      val = ctx.get(val);
    }

    // 문자열이면 parse 시도
    if (typeof val === "string") {
      try {
        val = JSON.parse(val);
      } catch {
        // 파싱 실패 시 그대로 둠
      }
    }

    const getByPath = (obj: any, path: string) =>
      path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

    const setByPath = (obj: any, path: string, value: any) => {
      const keys = path.split(".");
      let cur = obj;
      while (keys.length > 1) {
        const k = keys.shift()!;
        if (!cur[k]) cur[k] = {};
        cur = cur[k];
      }
      cur[keys[0]] = value;
      return obj;
    };

    switch (op) {
      case "parse":
        if (typeof inputs.data !== "string") {
          throw new Error("json.parse requires data to be string");
        }
        return JSON.parse(inputs.data);

      case "stringify":
        return JSON.stringify(val, null, Number(inputs.space ?? 0));

      case "get":
        return getByPath(val, String(inputs.path ?? ""));

      case "set":
        return setByPath(val, String(inputs.path ?? ""), inputs.value);

      case "keys":
        return Object.keys(val);

      case "values":
        return Object.values(val);

      case "entries":
        return Object.entries(val);

      default:
        throw new Error(`Unknown json op: ${op}`);
    }
  }
};
