import { StepEventInfo, StepInfo } from "./stepTypes.js";

export interface StepEventEmitter {
  onStepStart(info: StepEventInfo): Promise<void> | void;
  onStepEnd(info: StepEventInfo, result?: any): Promise<void> | void;
  onStepError(info: StepEventInfo, error: Error): Promise<void> | void;
  onStepRetry(info: StepEventInfo, attempt: number, error: Error): Promise<void> | void;
  onStepJump(info: StepEventInfo, targetStepId: string): Promise<void> | void;
}

export const defaultStepEventEmitter: StepEventEmitter = {
  async onStepStart() {},
  async onStepEnd() {},
  async onStepError() {},
  async onStepRetry() {},
  async onStepJump() {},
};

export function createStepEventInfo(info: StepInfo): StepEventInfo {
  return {
    stepId: info.id,
    desc: info.desc,
    type: info.stepType,
    order: info.order,
    path: info.path,
    parentStepId: info.parentId,
  };
}
