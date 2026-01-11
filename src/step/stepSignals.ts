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

export class AbortError extends Error {
  constructor(message: string = "Execution aborted") {
    super(message);
    this.name = "AbortError";
  }
}

export class PlanStopSignal extends Error {
  constructor(message: string = "Plan stopped") {
    super(message);
    this.name = "PlanStopSignal";
  }
}

export class StepSkipSignal extends Error {
  constructor(message: string = "Step skipped") {
    super(message);
    this.name = "StepSkipSignal";
  }
}
