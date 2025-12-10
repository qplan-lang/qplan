// src/core/ast.ts

export type ASTNode =
  | FetchNode
  | CallNode
  | CalcNode
  | AiNode
  | IfNode
  | ParallelNode
  | BlockNode;

/**
 * 공통 노드 인터페이스
 */
export interface BaseNode {
  type: string;
  line: number;
}

/**
 * 여러 statement를 담는 블록 노드
 */
export interface BlockNode extends BaseNode {
  type: "Block";
  statements: ASTNode[];
}

/**
 * FETCH price stock=005930 days=30 -> price
 */
export interface FetchNode extends BaseNode {
  type: "Fetch";
  name: string;                     // FETCH price → price (모듈명)
  args: Record<string, any>;        // { stock: "005930", days: "30" }
  output: string;                   // -> price
}

/**
 * CALL send_mail to="x" -> result
 */
export interface CallNode extends BaseNode {
  type: "Call";
  name: string;
  args: Record<string, any>;
  output: string;
}

/**
 * CALC ma20 price -> ma20
 */
export interface CalcNode extends BaseNode {
  type: "Calc";
  calcName: string;                 // ma20
  input: string;                    // price
  output: string;                   // ma20
}

/**
 * AI "문장" USING price, ma20 -> out
 */
export interface AiNode extends BaseNode {
  type: "AI";
  prompt: string;                   // "문장"
  using: string[];                  // ["price", "ma20"]
  output: string;
}

/**
 * IF xxx > yyy:
 *    ...
 * ELSE:
 *    ...
 * END
 */
export interface IfNode extends BaseNode {
  type: "If";
  left: string;                     // price.close
  comparator: string;               // >, <, ==, EXISTS ...
  right: any;                       // value or identifier
  thenBlock: BlockNode;
  elseBlock?: BlockNode;
}

/**
 * PARALLEL:
 *    FETCH...
 *    FETCH...
 * END
 */
export interface ParallelNode extends BaseNode {
  type: "Parallel";
  block: BlockNode;                 // 내부 statement
  ignoreErrors?: boolean;
  concurrency?: number;     // 동시에 몇개씩 호출할건지
}

/**
 * AST Root
 */
export interface ASTRoot {
  type: "Root";
  block: BlockNode;
}
