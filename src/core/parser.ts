/**
 * qplan Parser
 * --------------------------------------
 * Tokenizer가 생성한 토큰들을 기반으로
 * AST(Action / If / Parallel / Block)을 생성한다.
 *
 * 모든 명령은 prefix(FETCH/CALC/CALL/AI) 없이
 *   <moduleName> key=value ... -> out
 * 형식의 ActionNode 로 파싱된다.
 */

import { Token, TokenType } from "./tokenizer.js";
import {
  ASTRoot,
  ASTNode,
  ActionNode,
  BlockNode,
  IfNode,
  ParallelNode,
  EachNode,
  StopNode,
  SkipNode
} from "./ast.js";
import { ParserError } from "./parserError.js";

export class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  // ----------------------------------------------------------
  // 기본 유틸
  // ----------------------------------------------------------
  private peek(offset = 0): Token {
    return this.tokens[this.pos + offset] || this.tokens[this.tokens.length - 1];
  }

  private match(type: TokenType, value?: string): boolean {
    const t = this.peek();
    return t.type === type && (value === undefined || t.value === value);
  }

  private consume(type: TokenType, value?: string): Token {
    const t = this.peek();
    if (!this.match(type, value)) {
      throw new ParserError(
        `Expected ${value ?? TokenType[type]}, got '${t.value}'`,
        t.line
      );
    }
    this.pos++;
    return t;
  }

  private check(type: TokenType, value?: string): boolean {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  private consumeIdentifier(): string {
    return this.consume(TokenType.Identifier).value;
  }

  private consumeString(): string {
    return this.consume(TokenType.String).value;
  }

  private consumeValueAny(): any {
    const t = this.peek();
    if (t.type === TokenType.String) return this.consumeString();
    if (t.type === TokenType.Number) return Number(this.consume(TokenType.Number).value);
    if (t.type === TokenType.Identifier) return this.consumeIdentifier();
    throw new ParserError(`Unexpected value '${t.value}'`, t.line);
  }

  // ----------------------------------------------------------
  // Root
  // ----------------------------------------------------------
  parse(): ASTRoot {
    const block = this.parseBlock();
    return {
      type: "Root",
      block,
    };
  }

  // ----------------------------------------------------------
  // Block
  // { statements }
  // ----------------------------------------------------------
  private parseBlock(): BlockNode {
    const statements: ASTNode[] = [];

    while (
      !this.match(TokenType.Keyword, "END") &&
      !this.match(TokenType.Symbol, "}") &&
      !this.match(TokenType.EOF)
    ) {
      statements.push(this.parseStatement());
    }

    return {
      type: "Block",
      statements,
      line: this.peek().line,
    };
  }

  // ----------------------------------------------------------
  // Statement
  // ----------------------------------------------------------
  private parseStatement(): ASTNode {
    const t = this.peek();

    // IF
    if (this.match(TokenType.Keyword, "IF")) return this.parseIf();

    // PARALLEL
    if (this.match(TokenType.Keyword, "PARALLEL")) return this.parseParallel();

    // EACH
    if (this.match(TokenType.Keyword, "EACH")) return this.parseEach();

    // STOP
    if (this.match(TokenType.Keyword, "STOP")) return this.parseStop();

    // SKIP
    if (this.match(TokenType.Keyword, "SKIP")) return this.parseSkip();

    // Block literal
    if (this.match(TokenType.Symbol, "{")) {
      this.consume(TokenType.Symbol, "{");
      const block = this.parseBlock();
      this.consume(TokenType.Symbol, "}");
      return block;
    }

    // Action
    if (this.match(TokenType.Identifier)) return this.parseAction();

    throw new ParserError(`Unexpected token '${t.value}'`, t.line);
  }

  // ----------------------------------------------------------
  // Action
  // ----------------------------------------------------------
  private parseAction(): ActionNode {
    const moduleName = this.consumeIdentifier();
    const line = this.peek().line;

    const args: Record<string, any> = {};

    // string-only (ai "prompt")
    if (this.match(TokenType.String)) {
      args["prompt"] = this.consumeString();

      if (this.match(TokenType.Keyword, "USING")) {
        this.consume(TokenType.Keyword, "USING");
        const vars: string[] = [];
        vars.push(this.consumeIdentifier());
        while (this.match(TokenType.Symbol, ",")) {
          this.consume(TokenType.Symbol, ",");
          vars.push(this.consumeIdentifier());
        }
        args["using"] = vars;
      }

      this.consume(TokenType.Symbol, "->");
      const out = this.consumeIdentifier();

      return {
        type: "Action",
        module: moduleName,
        args,
        output: out,
        line
      };
    }

    // key=value
    while (!this.match(TokenType.Symbol, "->")) {
      const key = this.consumeIdentifier();
      this.consume(TokenType.Symbol, "=");
      const value = this.consumeValueAny();
      args[key] = value;
    }

    this.consume(TokenType.Symbol, "->");
    const out = this.consumeIdentifier();

    return {
      type: "Action",
      module: moduleName,
      args,
      output: out,
      line,
    };
  }

  // ---------------------------------------
  // IF
  // ---------------------------------------
  private parseIf(): IfNode {
    const kw = this.consume(TokenType.Keyword, "IF");
    const line = kw.line;

    // left operand (identifier)
    const left = this.consume(TokenType.Identifier).value;

    // operator (Symbol or Identifier for EXISTS/NOT_EXISTS)
    let comparator: string;

    const opToken = this.peek();
    if (opToken.type === TokenType.Symbol) {
      const op = this.consume(TokenType.Symbol).value;
      const validOps = [">", "<", ">=", "<=", "==", "!="];
      if (!validOps.includes(op)) {
        throw new ParserError(`Invalid operator '${op}'`, opToken.line);
      }
      comparator = op;
    } else if (opToken.type === TokenType.Identifier) {
      const opId = this.consume(TokenType.Identifier).value.toUpperCase();
      const validIds = ["EXISTS", "NOT_EXISTS"];
      if (!validIds.includes(opId)) {
        throw new ParserError(`Invalid operator '${opId}'`, opToken.line);
      }
      comparator = opId;
    } else {
      throw new ParserError(
        `Invalid operator token '${opToken.value}'`,
        opToken.line
      );
    }

    // right operand (Identifier | Number | String)
    const rt = this.peek();
    let right: any;

    if (rt.type === TokenType.Number) {
      right = Number(this.consume(TokenType.Number).value);
    } else if (rt.type === TokenType.String) {
      right = this.consume(TokenType.String).value;
    } else if (rt.type === TokenType.Identifier) {
      right = this.consume(TokenType.Identifier).value;
    } else {
      throw new ParserError(`Invalid right operand '${rt.value}'`, rt.line);
    }

    // then block: { ... }
    this.consume(TokenType.Symbol, "{");
    const thenBlock = this.parseBlock();
    this.consume(TokenType.Symbol, "}");


    // else block (optional)
    let elseBlock: BlockNode | undefined;
    if (this.check(TokenType.Keyword, "ELSE")) {
      this.consume(TokenType.Keyword, "ELSE");
      this.consume(TokenType.Symbol, "{");
      elseBlock = this.parseBlock();
      this.consume(TokenType.Symbol, "}");
    }

    return {
      type: "If",
      left,
      comparator,
      right,
      thenBlock,
      elseBlock,
      line,
    };
  }

  // ----------------------------------------------------------
  // PARALLEL
  // ----------------------------------------------------------
  private parseParallel(): ParallelNode {
    const start = this.consume(TokenType.Keyword, "PARALLEL");
    const line = start.line;

    let ignoreErrors = false;
    let concurrency: number | undefined;

    const consumeOptions = () => {
      while (this.match(TokenType.Identifier)) {
        const nextKey = this.peek().value;
        if (nextKey !== "ignoreErrors" && nextKey !== "concurrency") break;
        const key = this.consumeIdentifier();
        this.consume(TokenType.Symbol, "=");
        const value = this.consumeValueAny();
        if (key === "ignoreErrors") ignoreErrors = value === true || value === "true";
        if (key === "concurrency") concurrency = Number(value);
      }
    };

    consumeOptions();

    let block: BlockNode;

    if (this.match(TokenType.Symbol, "{")) {
      this.consume(TokenType.Symbol, "{");
      block = this.parseBlock();
      this.consume(TokenType.Symbol, "}");
    } else {
      this.consume(TokenType.Symbol, ":");
      block = this.parseBlock();
      this.consume(TokenType.Keyword, "END");
    }

    consumeOptions();

    return {
      type: "Parallel",
      block,
      ignoreErrors,
      concurrency,
      line,
    };
  }

  // ----------------------------------------------------------
  // EACH <identifier> AS (value [, idx]) { ... }
  // ----------------------------------------------------------
  private parseEach(): EachNode {
    const kw = this.consume(TokenType.Keyword, "EACH");
    const line = kw.line;

    const iterable = this.consumeIdentifier();
    this.consume(TokenType.Keyword, "AS");
    this.consume(TokenType.Symbol, "(");
    const iterator = this.consumeIdentifier();
    let indexVar: string | undefined;
    if (this.match(TokenType.Symbol, ",")) {
      this.consume(TokenType.Symbol, ",");
      indexVar = this.consumeIdentifier();
    }
    this.consume(TokenType.Symbol, ")");

    this.consume(TokenType.Symbol, "{");
    const block = this.parseBlock();
    this.consume(TokenType.Symbol, "}");

    return {
      type: "Each",
      iterator,
      indexVar,
      iterable,
      block,
      line,
    };
  }

  // ----------------------------------------------------------
  // STOP / SKIP
  // ----------------------------------------------------------
  private parseStop(): StopNode {
    const kw = this.consume(TokenType.Keyword, "STOP");
    return { type: "Stop", line: kw.line };
  }

  private parseSkip(): SkipNode {
    const kw = this.consume(TokenType.Keyword, "SKIP");
    return { type: "Skip", line: kw.line };
  }
}
