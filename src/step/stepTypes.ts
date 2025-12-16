import { BlockNode, StepNode } from "../core/ast.js";

export type StepErrorPolicy =
  | { type: "fail" }
  | { type: "continue" }
  | { type: "retry"; retries: number }
  | { type: "jump"; targetStepId: string };

export interface StepTreeNode {
  node: StepNode;
  parent?: StepTreeNode;
  children: StepTreeNode[];
  block: BlockNode;
  index: number;
}

export interface StepInfo {
  node: StepNode;
  id?: string;
  desc?: string;
  stepType?: string;
  order: number;
  path: string[];
  parentId?: string;
  parent?: StepInfo;
  errorPolicy: StepErrorPolicy;
  children: StepInfo[];
  block: BlockNode;
  statementIndex: number;
}

export interface StepResolution {
  rootSteps: StepInfo[];
  infoByNode: Map<StepNode, StepInfo>;
  infoById: Map<string, StepInfo>;
}

export interface StepEventInfo {
  runId?: string;
  stepId?: string;
  desc?: string;
  type?: string;
  order: number;
  path: string[];
  depth: number;
  parentStepId?: string;
  errorPolicy: StepErrorPolicy;
  outputVar?: string;
}
