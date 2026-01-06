import { StepEventInfo, StepInfo } from "./stepTypes.js";
import { ExecutionContext } from "../core/executionContext.js";
import { ModuleRegistry } from "../core/moduleRegistry.js";
import type { PlanMeta } from "../core/ast.js";

export interface StepEventRunContext {
  runId: string;
  script: string;
  ctx: ExecutionContext;
  registry: ModuleRegistry;
  env?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PlanEventInfo {
  runId: string;
  totalSteps: number;
  rootSteps: StepEventInfo[];
  planMeta?: PlanMeta;
}

export interface StepEventEmitter {
  onPlanStart?(plan: PlanEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onPlanEnd?(plan: PlanEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onStepStart?(info: StepEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onStepEnd?(info: StepEventInfo, result?: any, context?: StepEventRunContext): Promise<void> | void;
  onStepError?(info: StepEventInfo, error: Error, context?: StepEventRunContext): Promise<void> | void;
  onStepRetry?(info: StepEventInfo, attempt: number, error: Error, context?: StepEventRunContext): Promise<void> | void;
  onStepJump?(info: StepEventInfo, targetStepId: string, context?: StepEventRunContext): Promise<void> | void;
}

export const defaultStepEventEmitter: Required<StepEventEmitter> = {
  async onPlanStart() {},
  async onPlanEnd() {},
  async onStepStart() {},
  async onStepEnd() {},
  async onStepError() {},
  async onStepRetry() {},
  async onStepJump() {},
};

export function createStepEventInfo(
  info: StepInfo,
  runContext?: StepEventRunContext
): StepEventInfo {
  return {
    runId: runContext?.runId,
    stepId: info.id,
    desc: info.desc,
    type: info.stepType,
    order: info.order,
    path: info.path,
    depth: info.path.length - 1,
    parentStepId: info.parentId,
    errorPolicy: info.errorPolicy,
  };
}
