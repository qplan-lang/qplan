import type { ASTRoot, PlanMeta } from "./core/ast.js";
import { resolveSteps } from "./step/stepResolver.js";
import type { StepResolution, StepInfo } from "./step/stepTypes.js";
import { ModuleRegistry } from "./core/moduleRegistry.js";
import { ExecutionContext } from "./core/executionContext.js";
import { Executor } from "./core/executor.js";
import type {
  PlanEventInfo,
  StepEventEmitter,
  StepEventRunContext,
} from "./step/stepEvents.js";
import type { StepEventInfo } from "./step/stepTypes.js";
import { validateScript, QplanValidationResult } from "./core/qplanValidation.js";
import { parseParamsMeta } from "./core/semanticValidator.js";
import { AbortError as SignalAbortError, PlanStopSignal } from "./step/stepSignals.js";
import {
  ExecutionController,
  ExecutionState,
  AbortError as ExecutionAbortError,
  type ExecutionSnapshot,
  type ExecutionControllerOptions,
} from "./core/executionController.js";

export type StepLifecycleStatus =
  | "pending"
  | "running"
  | "retrying"
  | "completed"
  | "error";

export interface QPlanStepState {
  id: string;
  desc?: string;
  type?: string;
  order: number;
  path: string[];
  parentStepId?: string;
  status: StepLifecycleStatus;
  error?: Error;
  result?: any;
}

export interface QPlanOptions {
  registry?: ModuleRegistry;
}

export interface QPlanRunOptions extends ExecutionControllerOptions {
  registry?: ModuleRegistry;
  stepEvents?: StepEventEmitter;
  env?: Record<string, any>;
  metadata?: Record<string, any>;
  params?: Record<string, any>;
  runId?: string;
  controller?: ExecutionController;
}

interface InternalStepState extends QPlanStepState {
  info: StepInfo;
}

let qplanRunCounter = 0;

export class QPlan {
  private ast: ASTRoot;
  private resolution: StepResolution;
  private stepStates: Map<string, InternalStepState> = new Map();
  private defaultRegistry?: ModuleRegistry;
  private controller?: ExecutionController;
  private currentContext?: ExecutionContext;

  constructor(private script: string, options: QPlanOptions = {}) {
    this.defaultRegistry = options.registry;
    this.ast = this.buildAst(script);
    this.resolution = resolveSteps(this.ast.block);
    this.initializeStepStates();
  }

  getStepList(): QPlanStepState[] {
    return Array.from(this.stepStates.values())
      .sort((a, b) => a.order - b.order)
      .map(({ info: _info, ...rest }) => ({ ...rest }));
  }

  getPlanMeta(): PlanMeta | undefined {
    return this.ast.planMeta;
  }

  async run(options: QPlanRunOptions = {}): Promise<ExecutionContext> {
    this.resetStepStates();
    const registry = options.registry ?? this.defaultRegistry ?? new ModuleRegistry();
    const runId = options.runId ?? `run-${Date.now()}-${++qplanRunCounter}`;
    // ExecutionController 생성 또는 사용
    this.controller = options.controller ?? new ExecutionController({
      timeout: options.timeout,
      autoCheckpoint: options.autoCheckpoint,
      maxSnapshots: options.maxSnapshots,
    });

    const paramsMeta = parseParamsMeta(this.ast.planMeta?.params);
    if (paramsMeta.hasEmpty || paramsMeta.invalid.length) {
      throw new Error("Invalid @params declaration");
    }
    if (paramsMeta.names.length) {
      const missing = paramsMeta.names.filter(name => !options.params || !(name in options.params));
      if (missing.length) {
        throw new Error(`Missing params: ${missing.join(", ")}`);
      }
    }

    const ctx = new ExecutionContext({
      env: options.env,
      metadata: options.metadata,
      runId,
      control: this.controller,
    });
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        ctx.set(key, value);
      }
    }
    this.currentContext = ctx;

    const runContext: StepEventRunContext = {
      runId,
      script: this.script,
      ctx,
      registry,
      env: options.env,
      metadata: options.metadata,
      params: options.params,
    };
    const executor = new Executor(registry, this.buildTrackingEmitter(options.stepEvents));
    try {
      await executor.run(this.ast, ctx, runContext, this.controller);
    } catch (err) {
      if (err instanceof PlanStopSignal) {
        return ctx;
      }
      if (
        err instanceof ExecutionAbortError ||
        err instanceof SignalAbortError ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return ctx;
      }
      throw err;
    }
    return ctx;
  }

  private buildAst(script: string): ASTRoot {
    const result = validateScript(script);
    if (!result.ok) {
      const error = new Error(result.error);
      (error as any).line = result.line;
      throw error;
    }
    return result.ast;
  }

  validate(): QplanValidationResult {
    return validateScript(this.script);
  }

  private initializeStepStates() {
    this.stepStates.clear();
    for (const info of this.resolution.infoById.values()) {
      this.stepStates.set(info.id, this.createState(info));
    }
  }

  private createState(info: StepInfo): InternalStepState {
    return {
      id: info.id,
      desc: info.desc,
      type: info.stepType,
      order: info.order,
      path: info.path,
      parentStepId: info.parentId,
      status: "pending",
      info,
    };
  }

  private resetStepStates() {
    for (const entry of this.stepStates.values()) {
      entry.status = "pending";
      entry.error = undefined;
      entry.result = undefined;
    }
  }

  private buildTrackingEmitter(userEmitter?: StepEventEmitter): StepEventEmitter {
    const forward = async <K extends keyof StepEventEmitter>(
      name: K,
      ...args: any[]
    ) => {
      const handler = userEmitter?.[name];
      if (handler) {
        await (handler as (...inner: any[]) => any)(...args);
      }
    };

    return {
      onPlanStart: async (plan: PlanEventInfo, context?: StepEventRunContext) => {
        this.resetStepStates();
        await forward("onPlanStart", plan, context as any);
      },
      onPlanEnd: async (plan: PlanEventInfo, context?: StepEventRunContext) => {
        await forward("onPlanEnd", plan, context as any);
      },
      onStepStart: async (info: StepEventInfo, context?: StepEventRunContext) => {
        this.markRunning(info.stepId);
        await forward("onStepStart", info, context as any);
      },
      onStepEnd: async (info: StepEventInfo, result: any, context?: StepEventRunContext) => {
        this.markCompleted(info.stepId, result);
        await forward("onStepEnd", info, result, context as any);
      },
      onStepError: async (info: StepEventInfo, error: Error, context?: StepEventRunContext) => {
        this.markError(info.stepId, error);
        await forward("onStepError", info, error, context as any);
      },
      onStepRetry: async (
        info: StepEventInfo,
        attempt: number,
        error: Error,
        context?: StepEventRunContext
      ) => {
        this.markRetrying(info.stepId, error);
        await forward("onStepRetry", info, attempt, error, context as any);
      },
      onStepJump: async (info: StepEventInfo, target: string, context?: StepEventRunContext) => {
        await forward("onStepJump", info, target, context as any);
      },
      onAbort: async (context?: StepEventRunContext) => {
        await forward("onAbort", context as any);
      },
      onPause: async (context?: StepEventRunContext) => {
        await forward("onPause", context as any);
      },
      onResume: async (context?: StepEventRunContext) => {
        await forward("onResume", context as any);
      },
      onTimeout: async (context?: StepEventRunContext) => {
        await forward("onTimeout", context as any);
      },
      onStateChange: async (newState: ExecutionState, oldState: ExecutionState, context?: StepEventRunContext) => {
        await forward("onStateChange", newState, oldState, context as any);
      },
    };
  }

  private markRunning(stepId: string) {
    const state = this.stepStates.get(stepId);
    if (!state) return;
    state.status = "running";
    state.error = undefined;
    state.result = undefined;
  }

  private markCompleted(stepId: string, result: any) {
    const state = this.stepStates.get(stepId);
    if (!state) return;
    state.status = "completed";
    state.result = result;
  }

  private markError(stepId: string, error: Error) {
    const state = this.stepStates.get(stepId);
    if (!state) return;
    state.status = "error";
    state.error = error;
  }

  private markRetrying(stepId: string, error: Error) {
    const state = this.stepStates.get(stepId);
    if (!state) return;
    state.status = "retrying";
    state.error = error;
  }

  // ========================================
  // Execution Control Methods
  // ========================================

  /**
   * 실행 중지 (강제 종료)
   */
  abort(): void {
    this.controller?.abort();
  }

  /**
   * 일시중지
   */
  pause(): void {
    this.controller?.pause();
  }

  /**
   * 재개
   */
  resume(): void {
    this.controller?.resume();
  }

  /**
   * 실행 상태 조회
   */
  getState(): ExecutionState {
    return this.controller?.state ?? ExecutionState.IDLE;
  }

  /**
   * 실행 상태 상세 정보 조회
   */
  getStatus() {
    return this.controller?.getStatus();
  }

  /**
   * 경과 시간 조회 (밀리초)
   */
  getElapsedTime(): number {
    return this.controller?.getElapsedTime() ?? 0;
  }

  // ========================================
  // Checkpoint Methods
  // ========================================

  /**
   * 현재 실행 상태의 체크포인트 생성
   */
  createCheckpoint(label?: string): ExecutionSnapshot | undefined {
    if (!this.currentContext || !this.controller) {
      return undefined;
    }
    return this.controller.createSnapshot(this.currentContext, label);
  }

  /**
   * 체크포인트에서 복원
   */
  async restoreCheckpoint(snapshot: ExecutionSnapshot): Promise<ExecutionContext | undefined> {
    if (!this.controller) {
      return undefined;
    }
    const ctx = this.controller.restoreSnapshot(snapshot);
    this.currentContext = ctx;
    return ctx;
  }

  /**
   * 모든 체크포인트 조회
   */
  getCheckpoints(): ExecutionSnapshot[] {
    return this.controller?.getSnapshots() ?? [];
  }

  /**
   * 특정 ID의 체크포인트 조회
   */
  getCheckpoint(snapshotId: string): ExecutionSnapshot | undefined {
    return this.controller?.getSnapshot(snapshotId);
  }

  /**
   * 가장 최근 체크포인트 조회
   */
  getLastCheckpoint(): ExecutionSnapshot | undefined {
    return this.controller?.getLastSnapshot();
  }

  /**
   * 모든 체크포인트 삭제
   */
  clearCheckpoints(): void {
    this.controller?.clearSnapshots();
  }
}
