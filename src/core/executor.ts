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
  WhileNode,
  ParallelNode,
  EachNode,
  BreakNode,
  ContinueNode,
  ConditionClause,
  ConditionExpression,
  StopNode,
  SkipNode,
  SetNode,
  ExpressionNode,
  StepNode,
  ReturnNode,
  JumpNode
} from "./ast.js";
import { ModuleRegistry } from "./moduleRegistry.js";
import { ExecutionContext } from "./executionContext.js";
import { resolveSteps } from "../step/stepResolver.js";
import { StepController } from "../step/stepController.js";
import { JumpSignal, StepReturnSignal, PlanStopSignal, StepSkipSignal, AbortError } from "../step/stepSignals.js";
import {
  StepEventEmitter,
  StepEventRunContext,
  PlanEventInfo,
  createStepEventInfo,
  defaultStepEventEmitter,
} from "../step/stepEvents.js";
import { StepInfo } from "../step/stepTypes.js";
import { ExecutionController, ExecutionState } from "./executionController.js";

class LoopSignal extends Error {
  constructor(public kind: "break" | "continue") {
    super(kind);
  }
}

export class Executor {
  private loopDepth = 0;
  private stepController?: StepController;
  private lastActionResult: any;
  private actionSequence = 0;
  private stepEvents: StepEventEmitter;
  private blockJumpOverrides = new Map<BlockNode, number>();
  private controller?: ExecutionController;

  constructor(private registry: ModuleRegistry, stepEvents?: StepEventEmitter) {
    this.stepEvents = stepEvents
      ? {
        ...defaultStepEventEmitter,
        ...stepEvents
      }
      : defaultStepEventEmitter;
  }

  async run(
    root: ASTRoot,
    ctx: ExecutionContext,
    runContext: StepEventRunContext,
    controller?: ExecutionController
  ): Promise<ExecutionContext> {
    this.controller = controller;

    // Controller 시작
    if (this.controller) {
      this.controller.setEventEmitter(this.stepEvents);
      this.controller.start(runContext);
    }

    const resolution = resolveSteps(root.block);
    const planInfo: PlanEventInfo = {
      runId: runContext.runId,
      totalSteps: resolution.infoByNode.size,
      rootSteps: resolution.rootSteps.map(info =>
        createStepEventInfo(info, runContext)
      ),
      planMeta: root.planMeta,
    };
    await this.stepEvents.onPlanStart?.(planInfo, runContext);
    if (resolution.rootSteps.length > 0) {
      this.stepController = new StepController(
        resolution,
        this.stepEvents,
        runContext
      );
    } else {
      this.stepController = undefined;
    }
    this.blockJumpOverrides.clear();
    try {
      while (true) {
        try {
          await this.executeBlock(root.block, ctx);
          break;
        } catch (err) {
          if (err instanceof JumpSignal) {
            this.prepareJump(err.target);
            continue;
          }
          throw err;
        }
      }

      // 정상 완료
      if (this.controller) {
        this.controller.complete();
      }
      planInfo.status = 'completed';

      return ctx;
    } catch (err) {
      // 에러 발생 - status 판별
      if (this.controller) {
        this.controller.error();
      }

      // 에러 타입에 따라 status 설정
      if (err instanceof PlanStopSignal) {
        planInfo.status = 'stopped';
      } else if (err instanceof AbortError) {
        planInfo.status = 'aborted';
      } else {
        planInfo.status = 'error';
      }
      planInfo.error = err as Error;

      throw err;
    } finally {
      this.stepController = undefined;
      await this.stepEvents.onPlanEnd?.(planInfo, runContext);
    }
  }

  private async executeBlock(block: BlockNode, ctx: ExecutionContext) {
    const statements = block.statements;
    const startIndex = this.consumeBlockOverride(block);
    const initialIndex = startIndex !== undefined ? Math.max(0, startIndex) : 0;
    for (let i = initialIndex; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await this.executeNode(stmt, ctx);
      } catch (err) {
        if (err instanceof JumpSignal) {
          if (err.target.block === block) {
            i = err.target.statementIndex - 1;
            continue;
          }
        }
        throw err;
      }
    }
  }

  private consumeBlockOverride(block: BlockNode): number | undefined {
    if (!this.blockJumpOverrides.has(block)) return undefined;
    const index = this.blockJumpOverrides.get(block);
    this.blockJumpOverrides.delete(block);
    return index;
  }

  private prepareJump(target: StepInfo) {
    this.blockJumpOverrides.clear();
    let current: StepInfo | undefined = target;
    while (current) {
      this.blockJumpOverrides.set(current.block, current.statementIndex);
      current = current.parent;
    }
  }

  private async executeNode(node: ASTNode, ctx: ExecutionContext): Promise<any> {
    // 실행 제어 확인 (abort, pause 등)
    if (this.controller) {
      await this.controller.checkControl();
    }

    switch (node.type) {
      case "Action": return this.execAction(node, ctx);
      case "If": return this.execIf(node, ctx);
      case "While": return this.execWhile(node, ctx);
      case "Parallel": return this.execParallel(node, ctx);
      case "Each": return this.execEach(node, ctx);
      case "Block": return this.executeBlock(node, ctx);
      case "Break": return this.execBreak(node);
      case "Continue": return this.execContinue(node);
      case "Stop": return this.execStop(node);
      case "Skip": return this.execSkip(node);
      case "Set": return this.execSet(node, ctx);
      case "Return": return this.execReturn(node, ctx);
      case "Step": return this.execStep(node, ctx);
      case "Jump": return this.execJump(node);
      default: throw new Error(`Unknown AST node type: ${(node as any).type}`);
    }
  }

  private async execAction(node: ActionNode, ctx: ExecutionContext) {
    const mod = this.registry.get(node.module);
    if (!mod) throw new Error(`Unknown module: ${node.module}`);

    const actionArgs = this.resolveActionArgs(node.args, ctx);
    let result;

    try {
      if (typeof mod === "function") {
        result = await mod(actionArgs, ctx);
      } else if (typeof mod.execute === "function") {
        result = await mod.execute(actionArgs, ctx);
      } else {
        throw new Error(`Invalid module type: ${node.module}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      (error as any).moduleId = node.module;
      error.message = `Module '${node.module}' failed: ${error.message}`;
      throw error;
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

    this.lastActionResult = result;
    this.actionSequence++;
  }

  private resolveActionArgs(
    args: Record<string, any> | undefined,
    ctx: ExecutionContext
  ): Record<string, any> {
    if (!args || !Object.keys(args).length) {
      return {};
    }

    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string" && ctx.has(value)) {
        resolved[key] = ctx.get(value);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
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
    let right = clause.right;
    if (clause.rightType === "identifier" && typeof right === "string") {
      right = ctx.get(right);
    } else if (typeof right === "string" && ctx.has(right)) {
      right = ctx.get(right);
    }

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

  private async execWhile(node: WhileNode, ctx: ExecutionContext) {
    this.loopDepth++;
    try {
      loop: while (this.evaluateCondition(node.condition, ctx)) {
        try {
          await this.executeBlock(node.block, ctx);
        } catch (err) {
          if (err instanceof LoopSignal) {
            if (err.kind === "continue") continue loop;
            if (err.kind === "break") break loop;
          }
          throw err;
        }
      }
    } finally {
      this.loopDepth--;
    }
  }

  // ----------------------------------------------------------
  // 루프 제어
  // ----------------------------------------------------------
  private execBreak(node: BreakNode) {
    if (this.loopDepth === 0) {
      throw new Error(`BREAK is only allowed inside loops (line ${node.line})`);
    }
    throw new LoopSignal("break");
  }

  private execContinue(node: ContinueNode) {
    if (this.loopDepth === 0) {
      throw new Error(`CONTINUE is only allowed inside loops (line ${node.line})`);
    }
    throw new LoopSignal("continue");
  }

  // ----------------------------------------------------------
  // Plan/Step 제어
  // ----------------------------------------------------------
  private execStop(node: StopNode) {
    // Plan 전체 중단
    throw new PlanStopSignal("Plan stopped by STOP statement");
  }

  private execSkip(node: SkipNode) {
    // Step 건너뛰기
    throw new StepSkipSignal("Step skipped by SKIP statement");
  }

  private execSet(node: SetNode, ctx: ExecutionContext) {
    if (!ctx.has(node.target)) {
      throw new Error(`set target '${node.target}' does not exist (line ${node.line})`);
    }
    const value = this.evaluateExpressionNode(node.expression, ctx);
    ctx.set(node.target, value);
  }

  private execReturn(node: ReturnNode, ctx: ExecutionContext) {
    const payload: Record<string, any> = {};
    for (const entry of node.entries) {
      payload[entry.key] = this.evaluateExpressionNode(entry.expression, ctx);
    }
    this.lastActionResult = payload;
    this.actionSequence++;
    throw new StepReturnSignal(payload);
  }

  private async execStep(node: StepNode, ctx: ExecutionContext) {
    // 현재 Step ID 설정
    if (this.controller) {
      this.controller.setCurrentStep(node.id);

      // 자동 체크포인트 생성
      if (this.controller.shouldAutoCheckpoint()) {
        this.controller.createSnapshot(ctx, `before-step-${node.id}`);
      }
    }

    const beginAttempt = () => this.actionSequence;
    const getResultSince = (snapshot: number) => ({
      hasResult: this.actionSequence > snapshot,
      value: this.lastActionResult,
    });

    if (!this.stepController) {
      const snapshot = beginAttempt();
      try {
        await this.executeBlock(node.block, ctx);
        const result = getResultSince(snapshot);
        if (result.hasResult) {
          ctx.setStepResult(node.id, result.value);
        }
      } catch (err) {
        if (err instanceof StepReturnSignal) {
          ctx.setStepResult(node.id, err.value);
          this.lastActionResult = err.value;
          this.actionSequence++;
          return;
        }
        throw err;
      }
      return;
    }

    await this.stepController.runStep(
      node,
      ctx,
      beginAttempt,
      () => this.executeBlock(node.block, ctx),
      getResultSince
    );
  }

  private execJump(node: JumpNode) {
    if (!this.stepController) {
      throw new Error("jump requires at least one defined step");
    }
    const targetInfo = this.stepController.getStepInfoById(node.targetStepId);
    if (!targetInfo) {
      throw new Error(`jump target '${node.targetStepId}' not found`);
    }
    throw new JumpSignal(targetInfo);
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
