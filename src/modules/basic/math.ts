import { ActionModule } from "../../core/actionModule.js";

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
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? arr.map(toNum) : [];
    } catch {
      throw new Error("Invalid array JSON for math module");
    }
  }
  throw new Error("math module requires array or array JSON");
}

export const mathModule: ActionModule = Object.assign(
  (inputs: Record<string, any>) => {
    const op = String(inputs.op);

    switch (op) {
      case "add":
        return toNum(inputs.a) + toNum(inputs.b);
      case "sub":
        return toNum(inputs.a) - toNum(inputs.b);
      case "mul":
        return toNum(inputs.a) * toNum(inputs.b);
      case "div":
        return toNum(inputs.a) / toNum(inputs.b);

      case "sum": {
        const arr = toNumArray(inputs.arr);
        return arr.reduce((p, v) => p + v, 0);
      }

      case "avg": {
        const arr = toNumArray(inputs.arr);
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
