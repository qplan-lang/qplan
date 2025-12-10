// src/core/parser.ts

import {
  Token,
  TokenType,
} from "./tokenizer.js";

import {
  ASTRoot,
  BlockNode,
  FetchNode,
  CallNode,
  CalcNode,
  AiNode,
  IfNode,
  ParallelNode,
  ASTNode,
} from "./ast";

export class ParserError extends Error {
  constructor(message: string, line: number) {
    super(`${message} (line ${line})`);
    this.name = "ParserError";
  }
}

/**
 * Parser: Token → AST
 */
export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTRoot {
    const block = this.parseBlock();
    return {
      type: "Root",
      block,
    };
  }

  // -----------------------------------------------------
  // Helpers
  // -----------------------------------------------------
  private isKeyword(value: string): boolean {
    const t = this.peek();
    return t.type === TokenType.Keyword && t.value === value;
  }

  // -----------------------------------------------------
  // Block
  // -----------------------------------------------------
  private parseBlock(): BlockNode {
    const statements: ASTNode[] = [];

    while (!this.isEOF() && !this.isKeyword("END") && !this.isKeyword("ELSE")) {
      // 빈 줄(Newline)은 스킵
      if (this.match(TokenType.Newline)) {
        this.consume();
        continue;
      }

      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    return {
      type: "Block",
      statements,
      line: this.peek().line,
    };
  }

  // -----------------------------------------------------
  // Statement Dispatcher
  // -----------------------------------------------------
  private parseStatement(): ASTNode | null {
    const token = this.peek();

    if (token.type === TokenType.Keyword) {
      switch (token.value) {
        case "FETCH":
          return this.parseFetch();
        case "CALL":
          return this.parseCall();
        case "CALC":
          return this.parseCalc();
        case "AI":
          return this.parseAI();
        case "IF":
          return this.parseIf();
        case "PARALLEL":
          return this.parseParallel();
      }
    }

    throw new ParserError(
      `Unexpected token '${token.value}'`,
      token.line
    );
  }

  // -----------------------------------------------------
  // FETCH name key=value ... -> out
  // -----------------------------------------------------
  private parseFetch(): FetchNode {
    const start = this.consumeKeyword("FETCH");
    const name = this.consumeIdentifier();

    const args = this.parseArguments();

    this.consumeArrow();
    const output = this.consumeIdentifier();

    return {
      type: "Fetch",
      name,
      args,
      output,
      line: start.line,
    };
  }

  // -----------------------------------------------------
  // CALL name key=value ... -> out
  // -----------------------------------------------------
  private parseCall(): CallNode {
    const start = this.consumeKeyword("CALL");
    const name = this.consumeIdentifier();

    const args = this.parseArguments();

    this.consumeArrow();
    const output = this.consumeIdentifier();

    return {
      type: "Call",
      name,
      args,
      output,
      line: start.line,
    };
  }

  // -----------------------------------------------------
  // CALC calcName input -> output
  // -----------------------------------------------------
  private parseCalc(): CalcNode {
    const start = this.consumeKeyword("CALC");
    const calcName = this.consumeIdentifier();
    const input = this.consumeIdentifier();

    this.consumeArrow();
    const output = this.consumeIdentifier();

    return {
      type: "Calc",
      calcName,
      input,
      output,
      line: start.line,
    };
  }

  // -----------------------------------------------------
  // AI "prompt" USING a,b -> out
  // -----------------------------------------------------
  private parseAI(): AiNode {
    const start = this.consumeKeyword("AI");
    const prompt = this.consumeString();

    this.consumeKeyword("USING");

    const using: string[] = [];
    using.push(this.consumeIdentifier());

    while (this.matchValue(",")) {
      this.consume();
      using.push(this.consumeIdentifier());
    }

    this.consumeArrow();

    const output = this.consumeIdentifier();

    return {
      type: "AI",
      prompt,
      using,
      output,
      line: start.line,
    };
  }

  // -----------------------------------------------------
  // IF A > B:
  //   ...
  // ELSE:
  //   ...
  // END
  // -----------------------------------------------------
  private parseIf(): IfNode {
    const start = this.consumeKeyword("IF");

    const left = this.consumeIdentifier();

    const compToken = this.consumeComparator();
    const comparator = compToken.value;

    // 오른쪽 값: number|string|identifier
    let right: any = null;
    const next = this.peek();
    if (next.type === TokenType.Number) {
      right = parseInt(next.value, 10);
      this.consume();
    } else if (next.type === TokenType.String) {
      right = next.value;
      this.consume();
    } else if (next.type === TokenType.Identifier) {
      right = next.value;
      this.consume();
    } else {
      throw new ParserError(
        `Invalid IF condition value: '${next.value}'`,
        next.line
      );
    }

    this.consumeValue(":"); // IF ... :

    // then block
    const thenBlock = this.parseBlock();

    // optional ELSE
    let elseBlock: BlockNode | undefined = undefined;

    if (this.matchKeyword("ELSE")) {
      this.consumeKeyword("ELSE");
      this.consumeValue(":");
      elseBlock = this.parseBlock();
    }

    // END mandatory
    this.consumeKeyword("END");

    return {
      type: "If",
      left,
      comparator,
      right,
      thenBlock,
      elseBlock,
      line: start.line,
    };
  }

  // -----------------------------------------------------
  // PARALLEL:
  //   statements...
  // END
  // -----------------------------------------------------
  private parseParallel(): ParallelNode {
    const start = this.consumeKeyword("PARALLEL");

    let ignoreErrors = false;
    let concurrency: number | undefined;

    // identifier=value 파싱
    while (this.match(TokenType.Identifier)) {
      const key = this.consumeIdentifier();
      this.consumeValue("=");
      const value = this.consumeValueAny();

      if (key === "ignoreErrors") {
        ignoreErrors = value === true || value === "true";
      }
      if (key === "concurrency") {
        concurrency = Number(value);
      }
    }

    this.consumeValue(":");

    const block = this.parseBlock();
    this.consumeKeyword("END");

    return {
      type: "Parallel",
      block,
      ignoreErrors,
      concurrency,
      line: start.line
    };
  }
  
  // -----------------------------------------------------
  // Utilities
  // -----------------------------------------------------
  private parseArguments(): Record<string, any> {
    const args: Record<string, any> = {};

    while (this.match(TokenType.Identifier)) {
      const key = this.consumeIdentifier();
      this.consumeValue("=");

      const value = this.consumeValueAny();
      args[key] = value;
    }

    return args;
  }

  private consumeValueAny(): any {
    const t = this.peek();

    if (t.type === TokenType.Number) {
      this.consume();
      return parseInt(t.value, 10);
    }

    if (t.type === TokenType.String) {
      this.consume();
      return t.value;
    }

    if (t.type === TokenType.Identifier) {
      this.consume();
      return t.value;
    }

    throw new ParserError(`Unexpected value '${t.value}'`, t.line);
  }

  private consumeKeyword(kw: string): Token {
    const t = this.peek();
    if (t.type === TokenType.Keyword && t.value === kw) {
      this.consume();
      return t;
    }
    throw new ParserError(`Expected keyword '${kw}', got '${t.value}'`, t.line);
  }

  private consumeIdentifier(): string {
    const t = this.peek();
    if (t.type === TokenType.Identifier) {
      this.consume();
      return t.value;
    }
    throw new ParserError(`Expected identifier, got '${t.value}'`, t.line);
  }

  private consumeString(): string {
    const t = this.peek();
    if (t.type === TokenType.String) {
      this.consume();
      return t.value;
    }
    throw new ParserError(`Expected string, got '${t.value}'`, t.line);
  }

  private consumeComparator(): Token {
    const t = this.peek();
    if (t.type === TokenType.Comparator) {
      this.consume();
      return t;
    }
    throw new ParserError(`Expected comparator, got '${t.value}'`, t.line);
  }

  private consumeArrow() {
    const t = this.peek();
    if (t.type === TokenType.Arrow) {
      this.consume();
      return;
    }
    throw new ParserError(`Expected '->', got '${t.value}'`, t.line);
  }

  private consumeValue(expected: string) {
    const t = this.peek();
    if (t.value === expected) {
      this.consume();
      return;
    }
    throw new ParserError(`Expected '${expected}', got '${t.value}'`, t.line);
  }

  private match(type: TokenType): boolean {
    return !this.isEOF() && this.peek().type === type;
  }

  private matchValue(value: string): boolean {
    return !this.isEOF() && this.peek().value === value;
  }

  private matchKeyword(kw: string): boolean {
    return (
      !this.isEOF() &&
      this.peek().type === TokenType.Keyword &&
      this.peek().value === kw
    );
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private isEOF(): boolean {
    return this.peek().type === TokenType.EOF;
  }
}
