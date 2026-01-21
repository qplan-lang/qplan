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
  VarNode,
} from "./ast.js";
import { resolveSteps } from "../step/stepResolver.js";
import { StepResolution } from "../step/stepTypes.js";

export interface SemanticIssue {
  message: string;
  line?: number;
  hint?: string;
}

export interface SemanticValidationOptions {
  initialVariables?: Iterable<string>;
}

export interface ParsedParamsMeta {
  names: string[];
  invalid: string[];
  hasEmpty: boolean;
}

export function parseParamsMeta(paramsMeta?: string): ParsedParamsMeta {
  if (!paramsMeta) {
    return { names: [], invalid: [], hasEmpty: false };
  }
  const names: string[] = [];
  const invalid: string[] = [];
  let hasEmpty = false;
  const seen = new Set<string>();
  for (const entry of paramsMeta.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) {
      hasEmpty = true;
      continue;
    }
    if (!isValidIdentifier(trimmed)) {
      invalid.push(trimmed);
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      names.push(trimmed);
    }
  }
  return { names, invalid, hasEmpty };
}

export function validateSemantics(
  root: ASTRoot,
  options: SemanticValidationOptions = {}
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  let stepIds: Set<string> = new Set();
  let resolution: StepResolution;
  const planLabel = getPlanLabel(root);
  const planSuffix = planLabel ? ` (plan '${planLabel}')` : "";

  try {
    resolution = resolveSteps(root.block);
  } catch (err) {
    issues.push({
      message: `${err instanceof Error ? err.message : String(err)}${planSuffix}`,
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
          message: `step '${label}'${planSuffix} has onError jump target '${info.errorPolicy.targetStepId}' but no such step exists`,
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
        message: `jump target '${jump.targetStepId}' not found${planSuffix}`,
        line: jump.line,
        hint: `Use jump to="${jump.targetStepId}" only if that step exists, or rename the jump target.`,
      });
    }
  }

  const paramsMeta = parseParamsMeta(root.planMeta?.params);
  if (paramsMeta.hasEmpty) {
    issues.push({
      message: `${planLabel ? `plan '${planLabel}' ` : ""}@params contains an empty entry`,
      hint: "Remove empty entries in @params (use comma-separated identifiers).",
    });
  }
  if (paramsMeta.invalid.length) {
    for (const name of paramsMeta.invalid) {
      issues.push({
        message: `${planLabel ? `plan '${planLabel}' ` : ""}@params contains invalid identifier '${name}'`,
        hint: "Identifiers must start with a letter/underscore and contain only letters, digits, or underscores.",
      });
    }
  }
  const variableIssues = validateVariables(
    root.block,
    planLabel,
    mergeInitialVariables(options.initialVariables, paramsMeta.names)
  );
  issues.push(...variableIssues);

  return issues;
}

function getPlanLabel(root: ASTRoot): string | undefined {
  if (!root.planMeta) return undefined;
  if (root.planMeta.title) return root.planMeta.title;
  if (root.planMeta.summary) return root.planMeta.summary;
  return undefined;
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

function validateVariables(
  block: BlockNode,
  planLabel?: string,
  initialVariables?: Iterable<string>
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  const available = new Set<string>();
  if (initialVariables) {
    for (const variable of initialVariables) {
      available.add(variable);
    }
  }
  validateBlockVariables(block, available, issues, undefined, planLabel);
  return issues;
}

function mergeInitialVariables(
  initialVariables?: Iterable<string>,
  params?: Iterable<string>
): string[] {
  const merged = new Set<string>();
  if (initialVariables) {
    for (const variable of initialVariables) {
      merged.add(variable);
    }
  }
  if (params) {
    for (const entry of params) {
      merged.add(entry);
    }
  }
  return Array.from(merged);
}

function isValidIdentifier(name: string): boolean {
  if (!name) return false;
  const first = name[0];
  if (!/[\p{L}_]/u.test(first)) return false;
  return /^[\p{L}\p{N}_]+$/u.test(name);
}

function validateBlockVariables(
  block: BlockNode,
  available: Set<string>,
  issues: SemanticIssue[],
  stepId?: string,
  planLabel?: string
) {
  for (const stmt of block.statements) {
    switch (stmt.type) {
      case "Action":
        validateActionNode(stmt, available, issues, stepId, planLabel);
        break;
      case "Set":
        validateSetNode(stmt, available, issues, stepId, planLabel);
        break;
      case "Var":
        validateVarNode(stmt, available, issues, stepId, planLabel);
        break;
      case "Return":
        validateReturnNode(stmt, available, issues, stepId, planLabel);
        break;
      case "If":
        validateConditionExpression(stmt.condition, available, issues, stepId, planLabel);
        if (stmt.thenBlock) {
          validateBlockVariables(stmt.thenBlock, new Set(available), issues, stepId, planLabel);
        }
        if (stmt.elseBlock) {
          validateBlockVariables(stmt.elseBlock, new Set(available), issues, stepId, planLabel);
        }
        break;
      case "While":
        validateConditionExpression(stmt.condition, available, issues, stepId, planLabel);
        validateBlockVariables(stmt.block, new Set(available), issues, stepId, planLabel);
        break;
      case "Parallel":
        validateBlockVariables(stmt.block, available, issues, stepId, planLabel);
        break;
      case "Each":
        ensureReference(stmt.iterable, stmt.line, available, issues, undefined, stepId, planLabel);
        {
          const loopScope = new Set(available);
          loopScope.add(stmt.iterator);
          if (stmt.indexVar) loopScope.add(stmt.indexVar);
          validateBlockVariables(stmt.block, loopScope, issues, stepId, planLabel);
        }
        break;
      case "Step":
        validateBlockVariables(stmt.block, available, issues, stmt.id, planLabel);
        available.add(stmt.id);
        break;
      case "Block":
        validateBlockVariables(stmt, available, issues, stepId, planLabel);
        break;
      default:
        break;
    }
  }
}

function validateActionNode(
  node: ActionNode,
  available: Set<string>,
  issues: SemanticIssue[],
  stepId?: string,
  planLabel?: string
) {
  if (node.argRefs) {
    for (const ref of node.argRefs) {
      ensureReference(ref, node.line, available, issues, undefined, stepId, planLabel);
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
  issues: SemanticIssue[],
  stepId?: string,
  planLabel?: string
) {
  ensureReference(node.target, node.line, available, issues, "set target", stepId, planLabel);
  const refs = new Set<string>();
  collectExpressionRefs(node.expression, refs);
  refs.forEach(ref => ensureReference(ref, node.line, available, issues, undefined, stepId, planLabel));
}

function validateVarNode(
  node: VarNode,
  available: Set<string>,
  issues: SemanticIssue[],
  stepId?: string,
  planLabel?: string
) {
  const refs = new Set<string>();
  collectExpressionRefs(node.expression, refs);
  refs.forEach(ref => ensureReference(ref, node.line, available, issues, undefined, stepId, planLabel));

  available.add(node.variable);
}

function validateReturnNode(
  node: ReturnNode,
  available: Set<string>,
  issues: SemanticIssue[],
  stepId?: string,
  planLabel?: string
) {
  for (const entry of node.entries) {
    const refs = new Set<string>();
    collectExpressionRefs(entry.expression, refs);
    refs.forEach(ref => ensureReference(ref, node.line, available, issues, undefined, stepId, planLabel));
  }
}

function validateConditionExpression(
  expr: ConditionExpression,
  available: Set<string>,
  issues: SemanticIssue[],
  stepId?: string,
  planLabel?: string
) {
  if (expr.type === "Binary") {
    validateConditionExpression(expr.left, available, issues, stepId, planLabel);
    validateConditionExpression(expr.right, available, issues, stepId, planLabel);
    return;
  }
  // Validate left and right expressions
  const leftRefs = new Set<string>();
  collectExpressionRefs(expr.left, leftRefs);
  leftRefs.forEach(ref => ensureReference(ref, expr.line, available, issues, undefined, stepId, planLabel));
  
  const rightRefs = new Set<string>();
  collectExpressionRefs(expr.right, rightRefs);
  rightRefs.forEach(ref => ensureReference(ref, expr.line, available, issues, undefined, stepId, planLabel));
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
  context?: string,
  stepId?: string,
  planLabel?: string
) {
  const base = name.split(".")[0];
  if (available.has(base)) return;
  const contextParts: string[] = [];
  if (planLabel) contextParts.push(`plan '${planLabel}'`);
  if (stepId) contextParts.push(`step '${stepId}'`);
  const contextSuffix = contextParts.length ? ` (${contextParts.join(", ")})` : "";
  const label = context ? `${context} '${name}'${contextSuffix}` : `variable '${name}'${contextSuffix}`;
  issues.push({
    message: `${label} is not defined`,
    line,
    hint: `Create '${name}' before using it (store an action output, return a field, or fix the variable name). If it's an external input, declare it in @params.`,
  });
}
