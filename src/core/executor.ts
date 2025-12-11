/**
 * Executor
 * -----------------------------------------
 * - ActionNode 실행 (함수형/객체형 자동 처리)
 * - future → ctx에 Promise 저장
 * - join → Promise.all 처리
 * - parallel → 병렬 실행
 * - if → 조건 분기
 */

import {
  ASTNode,
  ASTRoot,
  ActionNode,
  BlockNode,
  IfNode,
  ParallelNode,
  EachNode,
  StopNode,
  SkipNode
} from "./ast.js";
import { ModuleRegistry } from "./moduleRegistry.js";
import { ExecutionContext } from "./executionContext.js";

class LoopSignal extends Error {
  constructor(public kind: "break" | "continue") {
    super(kind);
  }
}

export class Executor {
  private loopDepth = 0;

  constructor(private registry: ModuleRegistry) {}

  async run(root: ASTRoot, ctx: ExecutionContext): Promise<ExecutionContext> {
    await this.executeBlock(root.block, ctx);
    return ctx;
  }

  private async executeBlock(block: BlockNode, ctx: ExecutionContext) {
    for (const stmt of block.statements) {
      await this.executeNode(stmt, ctx);
    }
  }

  private async executeNode(node: ASTNode, ctx: ExecutionContext): Promise<any> {
    switch (node.type) {
      case "Action": return this.execAction(node, ctx);
      case "If": return this.execIf(node, ctx);
      case "Parallel": return this.execParallel(node, ctx);
      case "Each": return this.execEach(node, ctx);
      case "Block": return this.executeBlock(node, ctx);
      case "Stop": return this.execStop(node);
      case "Skip": return this.execSkip(node);
      default: throw new Error(`Unknown AST node type: ${(node as any).type}`);
    }
  }

  private async execAction(node: ActionNode, ctx: ExecutionContext) {
    const mod = this.registry.get(node.module);
    if (!mod) throw new Error(`Unknown module: ${node.module}`);

    let result;

    if (typeof mod === "function") {
      result = await mod(node.args, ctx);
    } else if (typeof mod.execute === "function") {
      result = await mod.execute(node.args, ctx);
    } else {
      throw new Error(`Invalid module type: ${node.module}`);
    }

    // future 처리
    if (
      result &&
      typeof result === "object" &&
      (result as any).__future &&
      typeof (result as any).__future.then === "function"
    ) {
      ctx.set(node.output, (result as any).__future);
      return;
    }

    ctx.set(node.output, result);
  }

  private async execIf(node: IfNode, ctx: ExecutionContext) {
    const left = ctx.get(node.left);
    const right = node.right;
    let cond = false;

    switch (node.comparator) {
      case ">": cond = left > right; break;
      case "<": cond = left < right; break;
      case ">=": cond = left >= right; break;
      case "<=": cond = left <= right; break;
      case "==": cond = left == right; break;
      case "!=": cond = left != right; break;
      case "EXISTS": cond = left !== undefined; break;
      case "NOT_EXISTS": cond = left === undefined; break;
      default: throw new Error(`Unknown comparator: ${node.comparator}`);
    }

    if (cond) {
      await this.executeBlock(node.thenBlock, ctx);
    } else if (node.elseBlock) {
      await this.executeBlock(node.elseBlock, ctx);
    }
  }

  private async execParallel(node: ParallelNode, ctx: ExecutionContext) {
    const concurrency = node.concurrency ?? Infinity;
    const ignoreErrors = node.ignoreErrors ?? false;

    const stmts = node.block.statements;
    const results: Promise<any>[] = [];
    let index = 0;
    let running = 0;

    const runNext = () => {
      if (index >= stmts.length) return;

      const stmt = stmts[index++];
      running++;

      const p = this.executeNode(stmt, ctx)
        .catch(err => {
          if (!ignoreErrors) throw err;
        })
        .finally(() => {
          running--;
          runNext();
        });

      results.push(p);
    };

    for (let i = 0; i < Math.min(stmts.length, concurrency); i++) {
      runNext();
    }

    await Promise.all(results);
  }

  private async execEach(node: EachNode, ctx: ExecutionContext) {
    const iterable = ctx.get(node.iterable);
    if (!Array.isArray(iterable) && !(typeof iterable?.[Symbol.iterator] === "function")) {
      throw new Error(`Each loop requires iterable: ${node.iterable}`);
    }

    const values = Array.isArray(iterable) ? iterable : Array.from(iterable);

    this.loopDepth++;
    try {
      loop: for (let index = 0; index < values.length; index++) {
        ctx.set(node.iterator, values[index]);
        if (node.indexVar) ctx.set(node.indexVar, index);
        try {
          await this.executeBlock(node.block, ctx);
        } catch (err) {
          if (err instanceof LoopSignal) {
            if (err.kind === "continue") continue;
            if (err.kind === "break") break loop;
          }
          throw err;
        }
      }
    } finally {
      this.loopDepth--;
    }
  }

  private execStop(node: StopNode) {
    if (this.loopDepth === 0) {
      throw new Error(`STOP is only allowed inside EACH loops (line ${node.line})`);
    }
    throw new LoopSignal("break");
  }

  private execSkip(node: SkipNode) {
    if (this.loopDepth === 0) {
      throw new Error(`SKIP is only allowed inside EACH loops (line ${node.line})`);
    }
    throw new LoopSignal("continue");
  }
}
