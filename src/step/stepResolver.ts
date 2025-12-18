import {
  BlockNode,
  StepNode,
  ASTNode,
  ActionNode,
  IfNode,
  WhileNode,
  ParallelNode,
  EachNode,
} from "../core/ast.js";
import { parseStepTree } from "./stepParser.js";
import {
  StepErrorPolicy,
  StepInfo,
  StepResolution,
  StepTreeNode,
} from "./stepTypes.js";

export function resolveSteps(block: BlockNode): StepResolution {
  const { roots } = parseStepTree(block);
  const infoByNode = new Map<StepNode, StepInfo>();
  const infoById = new Map<string, StepInfo>();
  let order = 1;

  const build = (treeNode: StepTreeNode, parent?: StepInfo): StepInfo => {
    const label = treeNode.node.desc || treeNode.node.id || `step_${order}`;
    const resultKey = treeNode.node.output ?? treeNode.node.id;

    const info: StepInfo = {
      node: treeNode.node,
      id: treeNode.node.id,
      resultKey,
      desc: treeNode.node.desc,
      stepType: treeNode.node.stepType,
      order: order++,
      path: parent ? [...parent.path, label] : [label],
      parentId: parent?.id,
      parent,
      errorPolicy: parseErrorPolicy(treeNode.node.onError),
      children: [],
      block: treeNode.block,
      statementIndex: treeNode.index,
      actionOutputs: collectStepOutputs(treeNode.node.block),
    };

    infoByNode.set(treeNode.node, info);
    if (infoById.has(info.id)) {
      const existing = infoById.get(info.id)!;
      throw new Error(
        `Duplicate step id '${info.id}' (lines ${existing.node.line} and ${treeNode.node.line})`
      );
    }
    infoById.set(info.id, info);
    if (parent) {
      parent.children.push(info);
    }

    treeNode.children.forEach(child => build(child, info));
    return info;
  };

  const rootSteps = roots.map(rootNode => build(rootNode));

  return {
    rootSteps,
    infoByNode,
    infoById,
  };
}

function collectStepOutputs(block: BlockNode): string[] {
  const outputs = new Set<string>();

  const visitBlock = (current: BlockNode) => {
    current.statements.forEach(stmt => visitNode(stmt));
  };

  const visitNode = (node: ASTNode) => {
    switch (node.type) {
      case "Action": {
        const action = node as ActionNode;
        if (action.output) {
          outputs.add(action.output);
        }
        break;
      }
      case "If": {
        const ifNode = node as IfNode;
        visitBlock(ifNode.thenBlock);
        if (ifNode.elseBlock) {
          visitBlock(ifNode.elseBlock);
        }
        break;
      }
      case "While":
        visitBlock((node as WhileNode).block);
        break;
      case "Parallel":
        visitBlock((node as ParallelNode).block);
        break;
      case "Each":
        visitBlock((node as EachNode).block);
        break;
      case "Block":
        visitBlock(node as BlockNode);
        break;
      case "Step":
        // nested step: skip to avoid capturing child outputs
        break;
      default:
        break;
    }
  };

  visitBlock(block);
  return Array.from(outputs);
}

function parseErrorPolicy(raw?: string): StepErrorPolicy {
  if (!raw) {
    return { type: "fail" };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { type: "fail" };
  }

  const lower = trimmed.toLowerCase();
  if (lower === "fail") return { type: "fail" };
  if (lower === "continue") return { type: "continue" };

  const [namePart, valuePart] = trimmed.split("=", 2);
  const policy = namePart.trim().toLowerCase();

  if (policy === "retry") {
    const retries = Math.max(1, parseInt(valuePart ?? "1", 10) || 1);
    return { type: "retry", retries };
  }

  if (policy === "jump") {
    const target = stripQuotes(valuePart ?? "");
    if (!target) {
      throw new Error("jump policy requires target step id");
    }
    return { type: "jump", targetStepId: target };
  }

  return { type: "fail" };
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
