import { ActionModule } from "../../core/actionModule.js";

export const fileModule: ActionModule = {
  id: "file",
  description: "Node-only file read/write module",
  usage: `
file read path="./a.txt" -> text
file write path="./b.txt" data="hello" -> ok
  `,
  inputs: ["op", "path", "data"],
  async execute() {
    throw new Error("file module is only available in Node.js environments");
  },
};
