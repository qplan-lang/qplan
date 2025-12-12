import { BlockNode, StepNode } from "../core/ast.js";
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
    const info: StepInfo = {
      node: treeNode.node,
      id: treeNode.node.id,
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
    };

    infoByNode.set(treeNode.node, info);
    if (info.id) {
      if (infoById.has(info.id)) {
        const existing = infoById.get(info.id)!;
        throw new Error(
          `Duplicate step id '${info.id}' (lines ${existing.node.line} and ${treeNode.node.line})`
        );
      }
      infoById.set(info.id, info);
    }
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
