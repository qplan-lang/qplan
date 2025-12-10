// src/core/executor.ts

import {
  ASTRoot,
  ASTNode,
  BlockNode,
  FetchNode,
  CallNode,
  CalcNode,
  AiNode,
  IfNode,
  ParallelNode,
} from "./ast";
import { ExecutionContext } from "./executionContext.js";
import { ModuleRegistry } from "./moduleRegistry.js";

export class Executor {
  constructor(private registry: ModuleRegistry) {}

  async run(root: ASTRoot, ctx?: ExecutionContext): Promise<ExecutionContext> {
    const context = ctx ?? new ExecutionContext();
    await this.executeBlock(root.block, context);
    return context;
  }

  // ----------------- core dispatch -----------------

  private async executeBlock(
    block: BlockNode,
    ctx: ExecutionContext
  ): Promise<void> {
    for (const stmt of block.statements) {
      await this.executeNode(stmt, ctx);
    }
  }

  private async executeNode(node: ASTNode, ctx: ExecutionContext): Promise<void> {
    switch (node.type) {
      case "Fetch":
        return this.execFetch(node as FetchNode, ctx);
      case "Call":
        return this.execCall(node as CallNode, ctx);
      case "Calc":
        return this.execCalc(node as CalcNode, ctx);
      case "AI":
        return this.execAI(node as AiNode, ctx);
      case "If":
        return this.execIf(node as IfNode, ctx);
      case "Parallel":
        return this.execParallel(node as ParallelNode, ctx);
      case "Block":
        return this.executeBlock(node as BlockNode, ctx);
      default:
        throw new Error(`Unknown AST node type: ${(node as any).type}`);
    }
  }

  // ----------------- FETCH -----------------

  private async execFetch(node: FetchNode, ctx: ExecutionContext): Promise<void> {
    const moduleKey = this.resolveModuleKey("FETCH", node.name);
    const mod = this.registry.get(moduleKey);

    const inputs = {
      __action: "FETCH",
      __name: node.name,
      ...node.args,
    };

    const result = await Promise.resolve(mod.execute(inputs, ctx));
    ctx.set(node.output, result);
  }

  // ----------------- CALL -----------------

  private async execCall(node: CallNode, ctx: ExecutionContext): Promise<void> {
    const moduleKey = this.resolveModuleKey("CALL", node.name);
    const mod = this.registry.get(moduleKey);

    const inputs = {
      __action: "CALL",
      __name: node.name,
      ...node.args,
    };

    const result = await Promise.resolve(mod.execute(inputs, ctx));
    ctx.set(node.output, result);
  }

  // ----------------- CALC -----------------

  private async execCalc(node: CalcNode, ctx: ExecutionContext): Promise<void> {
    const moduleKey = this.resolveModuleKey("CALC", node.calcName);
    const mod = this.registry.get(moduleKey);

    const inputValue = ctx.get(node.input);

    const inputs = {
      __action: "CALC",
      calcName: node.calcName,
      input: inputValue,
    };

    const result = await Promise.resolve(mod.execute(inputs, ctx));
    ctx.set(node.output, result);
  }

  // ----------------- AI -----------------

  private async execAI(node: AiNode, ctx: ExecutionContext): Promise<void> {
    const moduleKey = "AI";
    const mod = this.registry.get(moduleKey);

    const usingVars: Record<string, any> = {};
    for (const name of node.using) {
      usingVars[name] = ctx.get(name);
    }

    const inputs = {
      __action: "AI",
      prompt: node.prompt,
      using: usingVars,
    };

    const result = await Promise.resolve(mod.execute(inputs, ctx));
    ctx.set(node.output, result);
  }

  // ----------------- IF -----------------

  private async execIf(node: IfNode, ctx: ExecutionContext): Promise<void> {
    const leftVal = ctx.get(node.left);
    const cond = this.evalCondition(
      leftVal,
      node.comparator,
      node.right
    );

    if (cond) {
      await this.executeBlock(node.thenBlock, ctx);
    } else if (node.elseBlock) {
      await this.executeBlock(node.elseBlock, ctx);
    }
  }

  private evalCondition(left: any, comparator: string, right: any): boolean {
    if (comparator === "EXISTS") {
      return left !== undefined && left !== null;
    }
    if (comparator === "NOT_EXISTS") {
      return left === undefined || left === null;
    }

    // 숫자 비교 시 숫자로 변환 시도
    const lNum = typeof left === "number" ? left : Number(left);
    const rNum = typeof right === "number" ? right : Number(right);

    const bothNumeric = !Number.isNaN(lNum) && !Number.isNaN(rNum);

    const a = bothNumeric ? lNum : left;
    const b = bothNumeric ? rNum : right;

    switch (comparator) {
      case ">":
        return (a as any) > (b as any);
      case "<":
        return (a as any) < (b as any);
      case ">=":
        return (a as any) >= (b as any);
      case "<=":
        return (a as any) <= (b as any);
      case "==":
        return a == b; // 의도적으로 느슨한 비교
      case "!=":
        return a != b;
      default:
        throw new Error(`Unsupported comparator: ${comparator}`);
    }
  }

  // ----------------- PARALLEL -----------------
  private async execParallel(node: ParallelNode, ctx: ExecutionContext): Promise<void> {
    const ignoreErrors = node.ignoreErrors === true;
    const concurrency = node.concurrency ?? Infinity; // 기본 무제한

    const statements = node.block.statements;
    const results: Promise<any>[] = [];
    let running = 0;
    let index = 0;

    const runNext = async () => {
      if (index >= statements.length) return;

      const stmt = statements[index++];
      running++;

      const p = this.executeNode(stmt, ctx)
        .catch(err => {
          if (!ignoreErrors) throw err;
        })
        .finally(() => {
          running--;
        });

      results.push(p);

      if (running < concurrency) runNext();
    };

    // 최초 concurrency 만큼 실행
    for (let i = 0; i < Math.min(concurrency, statements.length); i++) {
      runNext();
    }

    // 모두 끝날 때까지 기다림
    await Promise.all(results);
  }

  // ----------------- helpers -----------------

  /**
   * 모듈 키 해석:
   *  - 우선: TYPE_NAME  (e.g. FETCH_price, CALC_ma20, CALL_send_mail)
   *  - 없으면: TYPE     (공통 모듈)
   */
  private resolveModuleKey(base: string, name?: string): string {
    if (name) {
      const specific = `${base}_${name}`;
      if (this.registry.has(specific)) {
        return specific;
      }
    }
    if (this.registry.has(base)) {
      return base;
    }
    throw new Error(
      `No module registered for '${base}'` +
        (name ? ` or '${base}_${name}'` : "")
    );
  }
}
