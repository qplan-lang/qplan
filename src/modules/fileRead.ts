import fs from "fs/promises";
import { ActionModule } from "../core/moduleRegistry.js";

export class FileReadModule implements ActionModule {
  async execute(inputs: Record<string, any>) {
    const { path } = inputs;
    if (!path) throw new Error("path is required");

    return await fs.readFile(path, "utf8");
  }
}
