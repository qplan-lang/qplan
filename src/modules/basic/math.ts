import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";

/**
 * math 모듈
 * -----------------------------------------
 * 기본 수학 연산을 제공하는 모듈.
 *
 * op:
 *   - add : a + b
 *   - sub : a - b
 *   - mul : a * b
 *   - div : a / b
 *   - sum : arr 요소의 합
 *   - avg : arr 요소의 평균
 */

function resolveInput(value: any, ctx: ExecutionContext): any {
  if (typeof value === "string" && ctx.has(value)) {
    return ctx.get(value);
  }
  return value;
}

function toNum(v: any): number {
  const n = Number(v);
  if (isNaN(n)) throw new Error(`Invalid number: ${v}`);
  return n;
}

function toNumArray(v: any): number[] {
  if (Array.isArray(v)) {
    return v.map(toNum);
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return [];

    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) return arr.map(toNum);
    } catch {
      // fallthrough to manual parsing
    }

    const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return tokens.map(toNum);
  }
  throw new Error("math module requires array or array JSON");
}

export const mathModule: ActionModule = Object.assign(
  (inputs: Record<string, any>, ctx: ExecutionContext) => {
    const op = String(inputs.op);

    switch (op) {
      case "add":
        return toNum(resolveInput(inputs.a, ctx)) + toNum(resolveInput(inputs.b, ctx));
      case "sub":
        return toNum(resolveInput(inputs.a, ctx)) - toNum(resolveInput(inputs.b, ctx));
      case "mul":
        return toNum(resolveInput(inputs.a, ctx)) * toNum(resolveInput(inputs.b, ctx));
      case "div":
        return toNum(resolveInput(inputs.a, ctx)) / toNum(resolveInput(inputs.b, ctx));

      case "sum": {
        const arrInput = resolveInput(inputs.arr, ctx);
        const arr = toNumArray(arrInput);
        return arr.reduce((p, v) => p + v, 0);
      }

      case "avg": {
        const arrInput = resolveInput(inputs.arr, ctx);
        const arr = toNumArray(arrInput);
        if (arr.length === 0) return 0;
        return arr.reduce((p, v) => p + v, 0) / arr.length;
      }

      default:
        throw new Error(`Unknown math op: ${op}`);
    }
  },
  {
    id: "math",
    description: `
기본 수학 연산 모듈.
지원 op:
  add(a,b), sub(a,b), mul(a,b), div(a,b),
  sum(arr), avg(arr),
`,
    usage: `
math op="add" a=1 b=2 -> x
math op="avg" arr="[1,2,3]" -> y
`,
    inputs: ["op", "a", "b", "arr", "period"]
  }
);
