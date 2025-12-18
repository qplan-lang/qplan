import {
  ASTNode,
  ASTRoot,
  BlockNode,
  JumpNode,
  ActionNode,
  StepNode,
  SetNode,
  ReturnNode,
  IfNode,
  WhileNode,
  ParallelNode,
  EachNode,
  ConditionExpression,
  ConditionClause,
  ExpressionNode,
} from "./ast.js";
import { resolveSteps } from "../step/stepResolver.js";
import { StepResolution } from "../step/stepTypes.js";

export interface SemanticIssue {
  message: string;
  line?: number;
  hint?: string;
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
      hint: "Fix step structure issues first (duplicate IDs, invalid jumps, nesting errors).",
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
          hint: `Add step '${info.errorPolicy.targetStepId}' or change onError jump target to an existing step ID.`,
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
        hint: `Use jump to="${jump.targetStepId}" only if that step exists, or rename the jump target.`,
      });
    }
  }

  const variableIssues = validateVariables(root.block);
  issues.push(...variableIssues);

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

function validateVariables(block: BlockNode): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  const available = new Set<string>();
  validateBlockVariables(block, available, issues);
  return issues;
}

function validateBlockVariables(
  block: BlockNode,
  available: Set<string>,
  issues: SemanticIssue[]
) {
  for (const stmt of block.statements) {
    switch (stmt.type) {
      case "Action":
        validateActionNode(stmt, available, issues);
        break;
      case "Set":
        validateSetNode(stmt, available, issues);
        break;
      case "Return":
        validateReturnNode(stmt, available, issues);
        break;
      case "If":
        validateConditionExpression(stmt.condition, available, issues);
        if (stmt.thenBlock) {
          validateBlockVariables(stmt.thenBlock, new Set(available), issues);
        }
        if (stmt.elseBlock) {
          validateBlockVariables(stmt.elseBlock, new Set(available), issues);
        }
        break;
      case "While":
        validateConditionExpression(stmt.condition, available, issues);
        validateBlockVariables(stmt.block, new Set(available), issues);
        break;
      case "Parallel":
        validateBlockVariables(stmt.block, available, issues);
        break;
      case "Each":
        ensureReference(stmt.iterable, stmt.line, available, issues);
        {
          const loopScope = new Set(available);
          loopScope.add(stmt.iterator);
          if (stmt.indexVar) loopScope.add(stmt.indexVar);
          validateBlockVariables(stmt.block, loopScope, issues);
        }
        break;
      case "Step":
        validateBlockVariables(stmt.block, available, issues);
        available.add(stmt.id);
        break;
      case "Block":
        validateBlockVariables(stmt, available, issues);
        break;
      default:
        break;
    }
  }
}

function validateActionNode(
  node: ActionNode,
  available: Set<string>,
  issues: SemanticIssue[]
) {
  if (node.argRefs) {
    for (const ref of node.argRefs) {
      ensureReference(ref, node.line, available, issues);
    }
  }
  const suppressStore = Boolean((node.args as any)?.__suppressStore);
  if (!suppressStore && node.output) {
    available.add(node.output);
  }
}

function validateSetNode(
  node: SetNode,
  available: Set<string>,
  issues: SemanticIssue[]
) {
  ensureReference(node.target, node.line, available, issues, "set target");
  const refs = new Set<string>();
  collectExpressionRefs(node.expression, refs);
  refs.forEach(ref => ensureReference(ref, node.line, available, issues));
}

function validateReturnNode(
  node: ReturnNode,
  available: Set<string>,
  issues: SemanticIssue[]
) {
  for (const entry of node.entries) {
    const refs = new Set<string>();
    collectExpressionRefs(entry.expression, refs);
    refs.forEach(ref => ensureReference(ref, node.line, available, issues));
  }
}

function validateConditionExpression(
  expr: ConditionExpression,
  available: Set<string>,
  issues: SemanticIssue[]
) {
  if (expr.type === "Binary") {
    validateConditionExpression(expr.left, available, issues);
    validateConditionExpression(expr.right, available, issues);
    return;
  }
  ensureReference(expr.left, expr.line, available, issues);
  if (expr.rightType === "identifier" && typeof expr.right === "string") {
    ensureReference(expr.right, expr.line, available, issues);
  }
}

function collectExpressionRefs(expr: ExpressionNode, refs: Set<string>) {
  switch (expr.type) {
    case "Identifier":
      refs.add(expr.name);
      break;
    case "BinaryExpression":
      collectExpressionRefs(expr.left, refs);
      collectExpressionRefs(expr.right, refs);
      break;
    case "UnaryExpression":
      collectExpressionRefs(expr.argument, refs);
      break;
    default:
      break;
  }
}

function ensureReference(
  name: string,
  line: number | undefined,
  available: Set<string>,
  issues: SemanticIssue[],
  context?: string
) {
  const base = name.split(".")[0];
  if (available.has(base)) return;
  const label = context ? `${context} '${name}'` : `variable '${name}'`;
  issues.push({
    message: `${label} is not defined`,
    line,
    hint: `Create '${name}' before using it (store an action output, return a field, or fix the variable name).`,
  });
}
