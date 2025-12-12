import {
  ASTNode,
  ASTRoot,
  BlockNode,
  JumpNode,
} from "./ast.js";
import { resolveSteps } from "../step/stepResolver.js";
import { StepResolution } from "../step/stepTypes.js";

export interface SemanticIssue {
  message: string;
  line?: number;
}

export function validateSemantics(root: ASTRoot): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  let stepIds: Set<string> = new Set();
  let resolution: StepResolution;

  try {
    resolution = resolveSteps(root.block);
  } catch (err) {
    issues.push({
      message: err instanceof Error ? err.message : String(err),
    });
    return issues;
  }

  stepIds = new Set(resolution.infoById.keys());

  for (const info of resolution.infoByNode.values()) {
    if (info.errorPolicy.type === "jump") {
      if (!stepIds.has(info.errorPolicy.targetStepId)) {
        const label =
          info.node.id ??
          info.node.desc ??
          `step_${info.order}`;
        issues.push({
          message: `step '${label}' has onError jump target '${info.errorPolicy.targetStepId}' but no such step exists`,
          line: info.node.line,
        });
      }
    }
  }

  const jumps: JumpNode[] = [];
  collectJumpNodes(root.block, jumps);
  for (const jump of jumps) {
    if (!stepIds.has(jump.targetStepId)) {
      issues.push({
        message: `jump target '${jump.targetStepId}' not found`,
        line: jump.line,
      });
    }
  }

  return issues;
}

function collectJumpNodes(block: BlockNode, acc: JumpNode[]) {
  for (const stmt of block.statements) {
    visitNode(stmt, acc);
  }
}

function visitNode(node: ASTNode, acc: JumpNode[]) {
  switch (node.type) {
    case "Jump":
      acc.push(node);
      break;
    case "Block":
      collectJumpNodes(node, acc);
      break;
    case "If":
      collectJumpNodes(node.thenBlock, acc);
      if (node.elseBlock) {
        collectJumpNodes(node.elseBlock, acc);
      }
      break;
    case "While":
      collectJumpNodes(node.block, acc);
      break;
    case "Parallel":
      collectJumpNodes(node.block, acc);
      break;
    case "Each":
      collectJumpNodes(node.block, acc);
      break;
    case "Step":
      collectJumpNodes(node.block, acc);
      break;
    default:
      break;
  }
}
