import { ExecutionContext } from "../core/executionContext.js";
import { StepNode } from "../core/ast.js";
import { StepResolution, StepInfo } from "./stepTypes.js";
import { AbortError, JumpSignal, PlanStopSignal, StepReturnSignal, StepSkipSignal } from "./stepSignals.js";
import {
  StepEventEmitter,
  StepEventRunContext,
  createStepEventInfo,
  defaultStepEventEmitter,
} from "./stepEvents.js";

export class StepController {
  constructor(
    private resolution: StepResolution,
    private events: StepEventEmitter = defaultStepEventEmitter,
    private runContext: StepEventRunContext
  ) {}

  hasSteps(): boolean {
    return this.resolution.rootSteps.length > 0;
  }

  getStepInfo(node: StepNode) {
    return this.resolution.infoByNode.get(node);
  }

  getStepInfoById(stepId: string) {
    return this.resolution.infoById.get(stepId);
  }

  async runStep(
    node: StepNode,
    ctx: ExecutionContext,
    beginAttempt: () => number,
    executor: () => Promise<void>,
    getResultSince: (snapshot: number) => { hasResult: boolean; value: any }
  ): Promise<void> {
    const info = this.getStepInfo(node);
    const stepId = info?.id ?? node.id;
    if (!stepId) {
      throw new Error("step id is required to store results");
    }
    const resultKey = info?.resultKey ?? node.output ?? stepId;
    if (!info) {
      const snapshot = beginAttempt();
      try {
        await executor();
        const result = getResultSince(snapshot);
        if (result.hasResult) {
          this.setStepResultWithAlias(ctx, resultKey, stepId, result.value);
        }
      } catch (err) {
        if (err instanceof StepReturnSignal) {
          this.setStepResultWithAlias(ctx, resultKey, stepId, err.value);
          return;
        }
        if (err instanceof StepSkipSignal) {
          return;
        }
        throw err;
      }
      return;
    }

    const eventInfo = createStepEventInfo(info, this.runContext);
    let retriesLeft = info.errorPolicy.type === "retry" ? info.errorPolicy.retries : 0;
    let retryAttempt = 0;

    let started = false;

    while (true) {
      const snapshot = beginAttempt();
      if (!started) {
        await this.events.onStepStart?.(eventInfo, this.runContext);
        started = true;
      }
      try {
        await executor();
        const result = getResultSince(snapshot);
        let resultValue = result.hasResult ? result.value : undefined;
        if (result.hasResult) {
          resultValue = this.applyStepNamespace(info, ctx, resultValue, false);
          this.setStepResultWithAlias(ctx, resultKey, stepId, resultValue);
        }
        await this.events.onStepEnd?.(eventInfo, resultValue, this.runContext);
        return;
      } catch (err) {
        if (err instanceof StepReturnSignal) {
          const applied = this.applyStepNamespace(info, ctx, err.value, true);
          this.setStepResultWithAlias(ctx, resultKey, stepId, applied);
          await this.events.onStepEnd?.(eventInfo, applied, this.runContext);
          return;
        }
        if (err instanceof JumpSignal) {
          const jumpTargetId =
            err.target.id ??
            err.target.node.id ??
            err.target.node.desc ??
            String(err.target.order);
          await this.events.onStepJump?.(eventInfo, jumpTargetId, this.runContext);
          throw err;
        }

        if (err instanceof StepSkipSignal) {
          await this.events.onStepEnd?.(eventInfo, undefined, this.runContext);
          return;
        }

        if (err instanceof AbortError) {
          throw err;
        }
        if (err instanceof PlanStopSignal) {
          await this.events.onStepEnd?.(eventInfo, undefined, this.runContext);
          throw err;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        await this.events.onStepError?.(eventInfo, error, this.runContext);

        if (info.errorPolicy.type === "continue") {
          await this.events.onStepEnd?.(eventInfo, undefined, this.runContext);
          return;
        }

        if (info.errorPolicy.type === "retry") {
          if (retriesLeft <= 0) {
            throw error;
          }
          retryAttempt++;
          retriesLeft--;
          await this.events.onStepRetry?.(eventInfo, retryAttempt, error, this.runContext);
          started = false;
          continue;
        }

        if (info.errorPolicy.type === "jump") {
          const targetInfo = this.getStepInfoById(info.errorPolicy.targetStepId);
          if (!targetInfo) {
            throw new Error(`jump target '${info.errorPolicy.targetStepId}' not found`);
          }
          await this.events.onStepJump?.(eventInfo, info.errorPolicy.targetStepId, this.runContext);
          throw new JumpSignal(targetInfo);
        }

        throw error;
      }
    }
  }

  private setStepResultWithAlias(
    ctx: ExecutionContext,
    primaryKey: string,
    stepId: string,
    value: any
  ) {
    ctx.setStepResult(primaryKey, value);
    if (stepId && primaryKey !== stepId) {
      ctx.setStepResult(stepId, value);
    }
  }
  private applyStepNamespace(
    info: StepInfo,
    ctx: ExecutionContext,
    value: any,
    explicit: boolean
  ): any {
    if (explicit || !info.actionOutputs?.length) {
      return value;
    }
    const result: Record<string, any> = {};
    let hasValue = false;
    for (const outputName of info.actionOutputs) {
      if (!outputName) continue;
      if (!ctx.has(outputName)) continue;
      result[outputName] = ctx.get(outputName);
      hasValue = true;
    }
    if (!hasValue) {
      return value;
    }
    return result;
  }
}
