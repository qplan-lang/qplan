// src/modules/timeout.ts
import { ActionModule } from "../core/moduleRegistry.js";

export class TimeoutModule implements ActionModule {
  async execute(inputs: Record<string, any>) {
    const { ms, value } = inputs;
    if (!ms) throw new Error("Timeout module requires 'ms' parameter");

    return await Promise.race([
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout exceeded")), ms)
      ),
      Promise.resolve(value)
    ]);
  }
}
