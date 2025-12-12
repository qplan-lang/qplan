import { ASTNode, BlockNode } from "../core/ast.js";
import { StepTreeNode } from "./stepTypes.js";

export interface StepParseResult {
  roots: StepTreeNode[];
  all: StepTreeNode[];
}

export function parseStepTree(block: BlockNode): StepParseResult {
  const roots: StepTreeNode[] = [];
  const all: StepTreeNode[] = [];

  const visitChildBlocks = (node: ASTNode, parent?: StepTreeNode) => {
    switch (node.type) {
      case "Block":
        visitBlock(node, parent);
        break;
      case "If":
        visitBlock(node.thenBlock, parent);
        if (node.elseBlock) {
          visitBlock(node.elseBlock, parent);
        }
        break;
      case "While":
        visitBlock(node.block, parent);
        break;
      case "Parallel":
        visitBlock(node.block, parent);
        break;
      case "Each":
        visitBlock(node.block, parent);
        break;
      default:
        break;
    }
  };

  const visitBlock = (current: BlockNode, parent?: StepTreeNode) => {
    current.statements.forEach((stmt: ASTNode, index: number) => {
      if (stmt.type === "Step") {
        const treeNode: StepTreeNode = {
          node: stmt,
          parent,
          children: [],
          block: current,
          index,
        };
        all.push(treeNode);
        if (parent) {
          parent.children.push(treeNode);
        } else {
          roots.push(treeNode);
        }
        visitBlock(stmt.block, treeNode);
        return;
      }

      visitChildBlocks(stmt, parent);
    });
  };

  visitBlock(block);

  return { roots, all };
}
