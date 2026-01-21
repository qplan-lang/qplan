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
  params?: Record<string, any>;
}

export type PlanStatus = 'completed' | 'stopped' | 'aborted' | 'error';

export interface PlanEventInfo {
  runId: string;
  totalSteps: number;
  rootSteps: StepEventInfo[];
  planMeta?: PlanMeta;
  status?: PlanStatus;
  error?: Error;
}

// Core execution state type matching ExecutionController's enum
export type ExecutionState = 'idle' | 'running' | 'paused' | 'completed' | 'aborted' | 'error';

export interface StepEventEmitter {
  onPlanStart?(plan: PlanEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onPlanEnd?(plan: PlanEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onStepStart?(info: StepEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onStepEnd?(info: StepEventInfo, result?: any, context?: StepEventRunContext): Promise<void> | void;
  onStepError?(info: StepEventInfo, error: Error, context?: StepEventRunContext): Promise<void> | void;
  onStepRetry?(info: StepEventInfo, attempt: number, error: Error, context?: StepEventRunContext): Promise<void> | void;
  onStepJump?(info: StepEventInfo, targetStepId: string, context?: StepEventRunContext): Promise<void> | void;

  // Execution Control Events
  onAbort?(context?: StepEventRunContext): Promise<void> | void;
  onPause?(context?: StepEventRunContext): Promise<void> | void;
  onResume?(context?: StepEventRunContext): Promise<void> | void;
  onTimeout?(context?: StepEventRunContext): Promise<void> | void;
  onStateChange?(newState: ExecutionState, oldState: ExecutionState, context?: StepEventRunContext): Promise<void> | void;
}

export const defaultStepEventEmitter: Required<StepEventEmitter> = {
  async onPlanStart() { },
  async onPlanEnd() { },
  async onStepStart() { },
  async onStepEnd() { },
  async onStepError() { },
  async onStepRetry() { },
  async onStepJump() { },
  async onAbort() { },
  async onPause() { },
  async onResume() { },
  async onTimeout() { },
  async onStateChange() { },
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
