/**
 * AST (Abstract Syntax Tree)
 * ---------------------------
 * AST는 QPlan 코드를 "구문 구조대로 해석한 결과"를
 * 트리(Tree) 형태로 표현한 자료구조이다.
 *
 * 즉, 사용자가 작성한 문자열 스크립트를
 *   → Tokenizer가 토큰으로 나누고
 *   → Parser가 토큰을 AST 노드들로 조립하여
 *   → Executor가 AST를 순서대로 실행한다.
 *
 * AST는 실행 가능한 '프로그램 구조' 그 자체이며,
 * QPlan 엔진의 중심 데이터 모델이다.
 *
 * 이 파일은 QPlan Language에 등장할 수 있는 모든 노드(Action/If/Parallel/Block)를 정의한다.
 */

export interface BaseNode {
  type: string;
  line: number;
}

/**
 * 하나의 QPlan script 명령 = 1개의 ActionNode
 * 예)
 *   fetchHttp url="https://site.com" -> html
 *   extractHeadline input=html -> heads
 *   ai "요약해줘" USING heads -> summary
 */
export interface ActionNode extends BaseNode {
  type: "Action";
  module: string;
  args: Record<string, any>;
  output: string;
  argRefs?: string[];
}

/**
 * 여러 QPlan script 명령의 묶음
 */
export interface BlockNode extends BaseNode {
  type: "Block";
  statements: ASTNode[];
}

/**
 * Step 문
 */
export interface StepNode extends BaseNode {
  type: "Step";
  id: string;
  desc?: string;
  stepType?: string;
  onError?: string;
  output?: string;
  block: BlockNode;
}

export interface ReturnEntry {
  key: string;
  expression: ExpressionNode;
}

export interface ReturnNode extends BaseNode {
  type: "Return";
  entries: ReturnEntry[];
}

/**
 * jump 문
 */
export interface JumpNode extends BaseNode {
  type: "Jump";
  targetStepId: string;
}

/**
 * 조건문
 */
export interface IfNode extends BaseNode {
  type: "If";
  condition: ConditionExpression;
  thenBlock: BlockNode;
  elseBlock?: BlockNode;
}

export type ConditionExpression = ConditionClause | ConditionBinary;

export interface ConditionClause {
  type: "Simple";
  left: string;
  negated?: boolean;
  comparator: string;
  right: any;
  rightType?: "identifier" | "string" | "number" | "boolean" | "null";
  line: number;
}

export interface ConditionBinary {
  type: "Binary";
  operator: "AND" | "OR";
  left: ConditionExpression;
  right: ConditionExpression;
}

/**
 * 병렬 실행 블록
 */
export interface ParallelNode extends BaseNode {
  type: "Parallel";
  block: BlockNode;
  ignoreErrors?: boolean;
  concurrency?: number;
}

/**
 * 반복문(each)
 */
export interface EachNode extends BaseNode {
  type: "Each";
  iterator: string;
  iterable: string;
  indexVar?: string;
  block: BlockNode;
}

/**
 * while 루프
 */
export interface WhileNode extends BaseNode {
  type: "While";
  condition: ConditionExpression;
  block: BlockNode;
}

/**
 * 루프 제어
 */
export interface BreakNode extends BaseNode {
  type: "Break";
}

export interface ContinueNode extends BaseNode {
  type: "Continue";
}

/**
 * Plan/Step 제어
 */
export interface StopNode extends BaseNode {
  type: "Stop";
}

export interface SkipNode extends BaseNode {
  type: "Skip";
}

/**
 * set 문
 */
export interface SetNode extends BaseNode {
  type: "Set";
  target: string;
  expression: ExpressionNode;
}

/**
 * var 문 (새 변수 선언/초기화 + 표현식 지원)
 */
export interface VarNode extends BaseNode {
  type: "Var";
  variable: string;
  expression: ExpressionNode;
}

export type ExpressionNode =
  | LiteralExpression
  | IdentifierExpression
  | BinaryExpression
  | UnaryExpression;

export interface LiteralExpression {
  type: "Literal";
  value: any;
}

export interface IdentifierExpression {
  type: "Identifier";
  name: string;
}

export interface BinaryExpression {
  type: "BinaryExpression";
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExpression {
  type: "UnaryExpression";
  operator: "-";
  argument: ExpressionNode;
}

/**
 * 전체 AST 루트
 */
export interface ASTRoot {
  type: "Root";
  block: BlockNode;
  planMeta?: PlanMeta;
}

export interface PlanMeta {
  title?: string;
  summary?: string;
  version?: string;
  since?: string;
}

export type ASTNode =
  | ActionNode
  | IfNode
  | WhileNode
  | ParallelNode
  | EachNode
  | BreakNode
  | ContinueNode
  | StopNode
  | SkipNode
  | ReturnNode
  | SetNode
  | VarNode
  | BlockNode
  | StepNode
  | JumpNode;
