// src/modules/join.ts
import { ExecutionContext } from "../core/executionContext.js";
import { ActionModule } from "../core/moduleRegistry.js";

export class JoinModule implements ActionModule {
  async execute(inputs: Record<string, any>, ctx: ExecutionContext) {
    const { futures } = inputs;

    // futures="f1,f2" → ["f1","f2"]
    const names = String(futures).split(",").map(s => s.trim());

    const promises = names.map(n => {
      const p = ctx.get(n);
      if (!p) throw new Error(`Future '${n}' not found`);
      return p;
    });

    const results = await Promise.all(promises);
    return results;
  }
}
