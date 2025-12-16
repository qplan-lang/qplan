import { ExecutionContext } from "../core/executionContext.js";
import { StepNode } from "../core/ast.js";
import { StepResolution } from "./stepTypes.js";
import { JumpSignal, StepReturnSignal } from "./stepSignals.js";
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
    if (!info) {
      const snapshot = beginAttempt();
      try {
        await executor();
        const result = getResultSince(snapshot);
        if (node.output && result.hasResult) {
          ctx.set(node.output, result.value);
        }
      } catch (err) {
        if (err instanceof StepReturnSignal) {
          if (node.output) {
            ctx.set(node.output, err.value);
          }
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
        const resultValue = result.hasResult ? result.value : undefined;
        if (node.output && result.hasResult) {
          ctx.set(node.output, result.value);
        }
        await this.events.onStepEnd?.(eventInfo, resultValue, this.runContext);
        return;
      } catch (err) {
        if (err instanceof StepReturnSignal) {
          const result = err.value;
          if (node.output) {
            ctx.set(node.output, result);
          }
          await this.events.onStepEnd?.(eventInfo, result, this.runContext);
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

}
