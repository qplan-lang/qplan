import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";
/**
 * join 모듈
 * -----------------------------------------
 * 여러 future 결과를 병렬로 모아 배열로 반환.
 *
 * QPlan script 예:
 *   join futures="f1,f2,f3" -> out
 */
export const joinModule: ActionModule = {
  id: "join",
  description: "여러 future 결과를 병렬로 모아 배열로 반환.",
  usage: `join futures="f1,f2,f3" -> out`,
  inputs: ["futures"],

  async execute(inputs: Record<string, any>, ctx: ExecutionContext) {
    const futures = String(inputs.futures ?? "").trim();
    if (!futures) throw new Error(`join requires futures="f1,f2"`);

    const names = futures
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const promises = names.map((name) => {
      const p = ctx.get(name);
      if (!p) throw new Error(`Future '${name}' not found`);
      if (typeof p.then !== "function")
        throw new Error(`'${name}' is not a Promise/Future`);
      return p;
    });

    return await Promise.all(promises);
  }
};
