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
  ConditionClause,
  ConditionExpression,
  StopNode,
  SkipNode,
  SetNode,
  ExpressionNode
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
      case "Set": return this.execSet(node, ctx);
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

    if (!(node.args as any)?.__suppressStore) {
      ctx.set(node.output, result);
    }
  }

  private async execIf(node: IfNode, ctx: ExecutionContext) {
    const cond = this.evaluateCondition(node.condition, ctx);

    if (cond) {
      await this.executeBlock(node.thenBlock, ctx);
    } else if (node.elseBlock) {
      await this.executeBlock(node.elseBlock, ctx);
    }
  }

  private evaluateCondition(expr: ConditionExpression, ctx: ExecutionContext): boolean {
    if (expr.type === "Binary") {
      const left = this.evaluateCondition(expr.left, ctx);
      if (expr.operator === "AND") {
        if (!left) return false;
        return this.evaluateCondition(expr.right, ctx);
      } else {
        if (left) return true;
        return this.evaluateCondition(expr.right, ctx);
      }
    }
    return this.evaluateClause(expr, ctx);
  }

  private evaluateClause(clause: ConditionClause, ctx: ExecutionContext): boolean {
    const left = ctx.get(clause.left);
    const right = clause.right;

    let result: boolean;
    switch (clause.comparator) {
      case ">": result = left > right; break;
      case "<": result = left < right; break;
      case ">=": result = left >= right; break;
      case "<=": result = left <= right; break;
      case "==": result = left == right; break;
      case "!=": result = left != right; break;
      case "EXISTS": result = left !== undefined; break;
      case "NOT_EXISTS": result = left === undefined; break;
      default: throw new Error(`Unknown comparator: ${clause.comparator}`);
    }

    return clause.negated ? !result : result;
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

  private execSet(node: SetNode, ctx: ExecutionContext) {
    if (!ctx.has(node.target)) {
      throw new Error(`set target '${node.target}' does not exist (line ${node.line})`);
    }
    const value = this.evaluateExpressionNode(node.expression, ctx);
    ctx.set(node.target, value);
  }

  private evaluateExpressionNode(expr: ExpressionNode, ctx: ExecutionContext): any {
    switch (expr.type) {
      case "Literal":
        return expr.value;
      case "Identifier":
        if (!ctx.has(expr.name)) {
          throw new Error(`Unknown identifier '${expr.name}' in set expression`);
        }
        return ctx.get(expr.name);
      case "UnaryExpression":
        return -this.evaluateExpressionNode(expr.argument, ctx);
      case "BinaryExpression": {
        const left = this.evaluateExpressionNode(expr.left, ctx);
        const right = this.evaluateExpressionNode(expr.right, ctx);
        switch (expr.operator) {
          case "+": return left + right;
          case "-": return left - right;
          case "*": return left * right;
          case "/": return left / right;
          default: throw new Error(`Unsupported operator '${expr.operator}'`);
        }
      }
      default:
        throw new Error(`Unknown expression node ${(expr as any).type}`);
    }
  }
}
