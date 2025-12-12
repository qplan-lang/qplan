import { StepInfo } from "./stepTypes.js";

export class JumpSignal extends Error {
  constructor(public target: StepInfo) {
    super(`jump to step '${target.id ?? "(anonymous)"}'`);
    this.name = "JumpSignal";
  }
}

export class StepReturnSignal extends Error {
  constructor(public value: any) {
    super("step return");
    this.name = "StepReturnSignal";
  }
}
