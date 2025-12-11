import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";
import fs from "fs/promises";
import path from "path";

/**
 * file 모듈
 * -----------------------------------------
 * 파일 읽기/쓰기 기능을 제공.
 *
 * op:
 *   - read  : 파일 내용을 문자열로 읽어서 반환
 *   - write : 문자열/객체를 파일로 저장
 *
 * DSL 예:
 *   file op="read" path="./a.txt" -> text
 *   file op="write" path="./b.txt" data="hello" -> ok
 */
export const fileModule: ActionModule = {
  id: "file",
  description: "파일 읽기/쓰기 모듈. op = read 또는 write.",
  usage: `
file op="read" path="./a.txt" -> text
file op="write" path="./b.txt" data="hello" -> ok
  `,
  inputs: ["op", "path", "data"],

  async execute(inputs: Record<string, any>, ctx: ExecutionContext) {
    const op = String(inputs.op);
    const filePath = String(inputs.path);

    if (op === "read") {
      return await fs.readFile(filePath, "utf8");
    }

    if (op === "write") {
      let data = inputs.data;

      // ctx 변수명을 참조할 수도 있음
      if (typeof data === "string" && ctx.has(data)) {
        data = ctx.get(data);
      }

      // 객체면 JSON 문자열로 변환
      if (typeof data === "object") {
        data = JSON.stringify(data, null, 2);
      }

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, String(data), "utf8");
      return "ok";
    }

    throw new Error(`Unknown op '${op}'`);
  }
};
