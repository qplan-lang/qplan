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
  WhileNode,
  ParallelNode,
  EachNode,
  StopNode,
  SkipNode,
  SetNode,
  StepNode,
  JumpNode,
  ReturnNode,
  ReturnEntry,
  ConditionClause,
  ConditionExpression,
  ExpressionNode
} from "./ast.js";
import { ParserError } from "./parserError.js";

export class Parser {
  private pos = 0;
  private printTempVar = 0;
  private autoTempVar = 0;

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
    const block = this.parseBlock(false);
    return {
      type: "Root",
      block,
    };
  }

  // ----------------------------------------------------------
  // Block
  // { statements }
  // ----------------------------------------------------------
  private parseBlock(insideStep: boolean): BlockNode {
    const statements: ASTNode[] = [];

    while (
      !this.match(TokenType.Keyword, "END") &&
      !this.match(TokenType.Symbol, "}") &&
      !this.match(TokenType.EOF)
    ) {
      statements.push(this.parseStatement(insideStep));
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
  private parseStatement(insideStep: boolean): ASTNode {
    const t = this.peek();

    // IF
    if (this.match(TokenType.Keyword, "IF")) return this.parseIf(insideStep);

    // PARALLEL
    if (this.match(TokenType.Keyword, "PARALLEL")) return this.parseParallel(insideStep);

    // EACH
    if (this.match(TokenType.Keyword, "EACH")) return this.parseEach(insideStep);

    // WHILE
    if (this.match(TokenType.Keyword, "WHILE")) return this.parseWhile(insideStep);

    // STOP
    if (this.match(TokenType.Keyword, "STOP")) return this.parseStop(insideStep);

    // SKIP
    if (this.match(TokenType.Keyword, "SKIP")) return this.parseSkip(insideStep);

    // RETURN
    if (this.match(TokenType.Keyword, "RETURN")) return this.parseReturn(insideStep);

    // SET
    if (this.match(TokenType.Keyword, "SET")) return this.parseSet(insideStep);

    // STEP
    if (this.match(TokenType.Keyword, "STEP")) return this.parseStep();

    // JUMP
    if (this.match(TokenType.Keyword, "JUMP")) return this.parseJump(insideStep);

    // Block literal
    if (this.match(TokenType.Symbol, "{")) {
      this.consume(TokenType.Symbol, "{");
      const block = this.parseBlock(insideStep);
      this.consume(TokenType.Symbol, "}");
      return block;
    }

    // Action
    if (this.match(TokenType.Identifier)) return this.parseAction(insideStep);

    throw new ParserError(`Unexpected token '${t.value}'`, t.line);
  }

  // ----------------------------------------------------------
  // Action
  // ----------------------------------------------------------
  private parseAction(insideStep: boolean): ActionNode {
    const moduleToken = this.consume(TokenType.Identifier);
    const moduleName = moduleToken.value;
    const line = moduleToken.line;

    if (!insideStep) {
      throw new ParserError("Actions must be inside a step block", line);
    }

    if (moduleName === "var") {
      return this.parseVarAction(moduleName, line);
    }

    if (moduleName === "print") {
      return this.parsePrintAction(moduleName, line);
    }

    const args: Record<string, any> = {};
    const options = this.collectModuleOptions(line);
    this.applyOptionsToArgs(args, options);
    let suppressStore = false;

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

      let out: string;
      if (this.check(TokenType.Symbol, "->")) {
        this.consume(TokenType.Symbol, "->");
        out = this.consumeIdentifier();
      } else {
        out = `__auto_dummy_${this.autoTempVar++}`;
        args.__suppressStore = true;
      }

      return {
        type: "Action",
        module: moduleName,
        args,
        output: out,
        line
      };
    }

    // key=value
    while (true) {
      if (this.check(TokenType.Symbol, "->")) break;
      const next = this.peek();
      if (next.type === TokenType.EOF) break;
      if (
        next.type === TokenType.Identifier &&
        this.peek(1).type === TokenType.Symbol &&
        this.peek(1).value === "="
      ) {
        const key = this.consumeIdentifier();
        this.consume(TokenType.Symbol, "=");
        const value = this.consumeValueAny();
        args[key] = value;
        continue;
      }
      break;
    }

    let out: string;
    if (this.check(TokenType.Symbol, "->")) {
      this.consume(TokenType.Symbol, "->");
      out = this.consumeIdentifier();
    } else {
      out = `__auto_dummy_${this.autoTempVar++}`;
      suppressStore = true;
    }

    if (suppressStore) {
      args.__suppressStore = true;
    }

    return {
      type: "Action",
      module: moduleName,
      args,
      output: out,
      line,
    };
  }

  private parseSet(insideStep: boolean): SetNode {
    const kw = this.consume(TokenType.Keyword, "SET");
    if (!insideStep) {
      throw new ParserError("SET is only allowed inside a step block", kw.line);
    }
    const line = kw.line;
    const target = this.consumeIdentifier();
    this.consume(TokenType.Symbol, "=");
    const expression = this.parseExpression();
    return {
      type: "Set",
      target,
      expression,
      line,
    };
  }

  private parseStep(): StepNode {
    const kw = this.consume(TokenType.Keyword, "STEP");
    const line = kw.line;
    let id: string | undefined;
    let desc: string | undefined;
    let stepType: string | undefined;
    let onError: string | undefined;

    let extraMeta:
      | {
          id?: string;
          desc?: string;
          stepType?: string;
          onError?: string;
        }
      | undefined;

    if (this.match(TokenType.String)) {
      desc = this.consumeString();
      extraMeta = this.parseStepMeta();
    } else {
      extraMeta = this.parseStepMeta();
    }

    if (extraMeta) {
      id = extraMeta.id ?? id;
      desc = extraMeta.desc ?? desc;
      stepType = extraMeta.stepType ?? stepType;
      onError = extraMeta.onError ?? onError;
    }

    let output: string | undefined;
    if (this.check(TokenType.Symbol, "->")) {
      this.consume(TokenType.Symbol, "->");
      output = this.consumeIdentifier();
    }

    this.consume(TokenType.Symbol, "{");
    const block = this.parseBlock(true);
    this.consume(TokenType.Symbol, "}");

    return {
      type: "Step",
      id,
      desc,
      stepType,
      onError,
      output,
      block,
      line,
    };
  }

  private parseJump(insideStep: boolean): JumpNode {
    const kw = this.consume(TokenType.Keyword, "JUMP");
    if (!insideStep) {
      throw new ParserError("JUMP is only allowed inside a step block", kw.line);
    }
    const line = kw.line;

    const targetKey = this.consumeIdentifier();
    if (targetKey.toLowerCase() !== "to") {
      throw new ParserError("jump requires 'to=<stepId>'", line);
    }
    this.consume(TokenType.Symbol, "=");
    let targetStepId: string;
    if (this.match(TokenType.String)) {
      targetStepId = this.consumeString();
    } else {
      targetStepId = this.consumeIdentifier();
    }

    return {
      type: "Jump",
      targetStepId,
      line,
    };
  }

  private parseStepMeta(): {
    id?: string;
    desc?: string;
    stepType?: string;
    onError?: string;
  } {
    const meta: { [key: string]: string | undefined } = {};

    while (true) {
      if (this.check(TokenType.Symbol, "{") || this.check(TokenType.Symbol, "->")) {
        break;
      }
      if (!this.match(TokenType.Identifier)) {
        break;
      }
      const key = this.consumeIdentifier();
      this.consume(TokenType.Symbol, "=");
      let value: string;
      if (this.match(TokenType.String)) {
        value = this.consumeString();
      } else if (this.match(TokenType.Identifier)) {
        value = this.consumeIdentifier();
      } else if (this.match(TokenType.Number)) {
        value = this.consume(TokenType.Number).value;
      } else {
        throw new ParserError(`Invalid step meta value '${this.peek().value}'`, this.peek().line);
      }

      meta[key] = value;
    }

    return {
      id: meta["id"],
      desc: meta["desc"],
      stepType: meta["type"],
      onError: meta["onError"] ?? meta["onerror"],
    };
  }

  /**
   * print 명령 전용 파서.
   * print "text", key=value, foo 처럼 자유 형식 인수를 수집해 __entries 로 넘긴다.
   */
  private parsePrintAction(moduleName: string, line: number): ActionNode {
    const entries = this.collectPrintEntries(line);
    const args: Record<string, any> = { __entries: entries };
    let output: string;
    let suppressStore = false;

    if (this.check(TokenType.Symbol, "->")) {
      this.consume(TokenType.Symbol, "->");
      output = this.consumeIdentifier();
    } else {
      output = `__print_dummy_${this.printTempVar++}`;
      suppressStore = true;
    }

    if (suppressStore) {
      args.__suppressStore = true;
    }

    return {
      type: "Action",
      module: moduleName,
      args,
      output,
      line,
    };
  }

  /**
   * 한 줄에서 print 인수들을 추출한다. 문자열/숫자/식별자/키=값 조합 지원.
   */
  private collectPrintEntries(line: number): any[] {
    const entries: any[] = [];

    while (!this.match(TokenType.EOF)) {
      const token = this.peek();
      if (token.line > line) break;
      if (this.check(TokenType.Symbol, "->")) break;

      if (this.check(TokenType.Symbol, ",")) {
        this.consume(TokenType.Symbol, ",");
        continue;
      }

      if (
        this.check(TokenType.Identifier) &&
        this.peek(1).type === TokenType.Symbol &&
        this.peek(1).value === "="
      ) {
        const key = this.consumeIdentifier();
        this.consume(TokenType.Symbol, "=");
        const value = this.consumeValueAny();
        entries.push({ kind: "kv", key, value });
        continue;
      }

      if (token.type === TokenType.String) {
        entries.push({ kind: "literal", value: this.consumeString() });
        continue;
      }

      if (token.type === TokenType.Number) {
        entries.push({
          kind: "literal",
          value: Number(this.consume(TokenType.Number).value),
        });
        continue;
      }

      if (token.type === TokenType.Identifier) {
        entries.push({ kind: "identifier", name: this.consumeIdentifier() });
        continue;
      }

      break;
    }

    return entries;
  }

  private parseVarAction(moduleName: string, line: number): ActionNode {
    const value = this.parseVarValue();
    const args: Record<string, any> = { value };

    if (!this.check(TokenType.Symbol, "->")) {
      throw new ParserError("var requires '-> outputVar'", line);
    }
    this.consume(TokenType.Symbol, "->");
    const output = this.consumeIdentifier();

    return {
      type: "Action",
      module: moduleName,
      args,
      output,
      line,
    };
  }

  private parseVarValue(): any {
    const token = this.peek();
    if (token.type === TokenType.String) {
      return this.consumeString();
    }
    if (token.type === TokenType.Number) {
      return Number(this.consume(TokenType.Number).value);
    }
    if (token.type === TokenType.Symbol && (token.value === "[" || token.value === "{")) {
      return this.parseJsonLiteralValue();
    }
    throw new ParserError(`Invalid var value '${token.value}'`, token.line);
  }

  private parseJsonLiteralValue(): any {
    const start = this.consume(TokenType.Symbol);
    const startSymbol = start.value;
    const stack: string[] = [startSymbol === "[" ? "]" : "}"];
    let jsonText = startSymbol;

    while (stack.length > 0) {
      const token = this.consumeAnyToken();
      if (token.type === TokenType.Symbol) {
        const value = token.value;
        if (value === "[" || value === "{") {
          stack.push(value === "[" ? "]" : "}");
          jsonText += value;
          continue;
        }
        if (value === stack[stack.length - 1]) {
          stack.pop();
          jsonText += value;
          continue;
        }
        jsonText += value;
        continue;
      }

      if (token.type === TokenType.String) {
        jsonText += JSON.stringify(token.value);
      } else {
        jsonText += token.value;
      }
    }

    try {
      return JSON.parse(jsonText);
    } catch {
      throw new ParserError("Invalid JSON literal for var", start.line);
    }
  }

  private consumeAnyToken(): Token {
    if (this.pos >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.pos++];
  }

  private collectModuleOptions(moduleLine: number): string[] {
    const options: string[] = [];
    let expectOption = true;

    while (true) {
      const token = this.peek();
      if (token.line !== moduleLine) break;

      if (expectOption) {
        if (token.type !== TokenType.Identifier) break;
        if (
          this.peek(1).type === TokenType.Symbol &&
          this.peek(1).value === "="
        ) {
          break;
        }
        options.push(this.consumeIdentifier());
        expectOption = false;
        continue;
      }

      if (this.check(TokenType.Keyword, "AND")) {
        this.consume(TokenType.Keyword, "AND");
        expectOption = true;
        continue;
      }
      break;
    }

    if (expectOption && options.length > 0) {
      throw new ParserError("Expected option after AND", this.peek().line);
    }

    return options;
  }

  private applyOptionsToArgs(args: Record<string, any>, options: string[]) {
    if (!options.length) return;
    args.__options = options;
    if (args.op === undefined) {
      args.op = options[0];
    }
  }

  // ----------------------------------------------------------
  // Expressions (for set)
  // ----------------------------------------------------------
  private parseExpression(precedence = 0): ExpressionNode {
    let expr = this.parseUnaryExpression();

    while (true) {
      const token = this.peek();
      if (token.type !== TokenType.Symbol) break;
      const opPrecedence = this.getExpressionPrecedence(token.value);
      if (opPrecedence === 0 || opPrecedence < precedence) break;
      const op = this.consume(TokenType.Symbol).value;
      const right = this.parseExpression(opPrecedence + 1);
      expr = {
        type: "BinaryExpression",
        operator: op,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private getExpressionPrecedence(op: string): number {
    if (op === "+" || op === "-") return 1;
    if (op === "*" || op === "/") return 2;
    return 0;
  }

  private parseUnaryExpression(): ExpressionNode {
    if (this.match(TokenType.Symbol, "+")) {
      this.consume(TokenType.Symbol, "+");
      return this.parseUnaryExpression();
    }
    if (this.match(TokenType.Symbol, "-")) {
      this.consume(TokenType.Symbol, "-");
      return {
        type: "UnaryExpression",
        operator: "-",
        argument: this.parseUnaryExpression(),
      };
    }
    return this.parseExpressionPrimary();
  }

  private parseExpressionPrimary(): ExpressionNode {
    const token = this.peek();
    if (token.type === TokenType.Number) {
      return {
        type: "Literal",
        value: Number(this.consume(TokenType.Number).value),
      };
    }
    if (token.type === TokenType.String) {
      return {
        type: "Literal",
        value: this.consumeString(),
      };
    }
    if (token.type === TokenType.Identifier) {
      return {
        type: "Identifier",
        name: this.consumeIdentifier(),
      };
    }
    if (token.type === TokenType.Symbol && token.value === "(") {
      this.consume(TokenType.Symbol, "(");
      const expr = this.parseExpression();
      this.consume(TokenType.Symbol, ")");
      return expr;
    }
    if (
      token.type === TokenType.Symbol &&
      (token.value === "[" || token.value === "{")
    ) {
      return {
        type: "Literal",
        value: this.parseJsonLiteralValue(),
      };
    }
    throw new ParserError(`Invalid expression token '${token.value}'`, token.line);
  }

  // ---------------------------------------
  // IF
  // ---------------------------------------
  private parseIf(insideStep: boolean): IfNode {
    const kw = this.consume(TokenType.Keyword, "IF");
    if (!insideStep) {
      throw new ParserError("IF is only allowed inside a step block", kw.line);
    }
    const line = kw.line;

    const condition = this.parseConditionExpression();

    // then block: { ... }
    this.consume(TokenType.Symbol, "{");
    const thenBlock = this.parseBlock(insideStep);
    this.consume(TokenType.Symbol, "}");


    // else block (optional)
    let elseBlock: BlockNode | undefined;
    if (this.check(TokenType.Keyword, "ELSE")) {
      this.consume(TokenType.Keyword, "ELSE");
      this.consume(TokenType.Symbol, "{");
      elseBlock = this.parseBlock(insideStep);
      this.consume(TokenType.Symbol, "}");
    }

    return {
      type: "If",
      condition,
      thenBlock,
      elseBlock,
      line,
    };
  }

  private parseWhile(insideStep: boolean): WhileNode {
    const kw = this.consume(TokenType.Keyword, "WHILE");
    if (!insideStep) {
      throw new ParserError("WHILE is only allowed inside a step block", kw.line);
    }
    const line = kw.line;
    const condition = this.parseConditionExpression();
    this.consume(TokenType.Symbol, "{");
    const block = this.parseBlock(insideStep);
    this.consume(TokenType.Symbol, "}");
    return {
      type: "While",
      condition,
      block,
      line,
    };
  }

  private parseConditionExpression(precedence = 0): ConditionExpression {
    let expr = this.parseConditionPrimary();

    while (true) {
      const token = this.peek();
      if (token.type !== TokenType.Keyword) break;
      const opValue = token.value.toUpperCase();
      if (opValue !== "AND" && opValue !== "OR") break;

      const opPrecedence = opValue === "OR" ? 1 : 2;
      if (opPrecedence < precedence) break;

      this.consume(TokenType.Keyword, opValue);
      const right = this.parseConditionExpression(opPrecedence);
      expr = {
        type: "Binary",
        operator: opValue as "AND" | "OR",
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseConditionPrimary(): ConditionExpression {
    if (this.match(TokenType.Symbol, "(")) {
      this.consume(TokenType.Symbol, "(");
      const expr = this.parseConditionExpression();
      this.consume(TokenType.Symbol, ")");
      return expr;
    }
    return this.parseConditionClause();
  }

  private parseConditionClause(): ConditionClause {
    let negated = false;
    while (this.match(TokenType.Keyword, "NOT")) {
      negated = !negated;
      this.consume(TokenType.Keyword, "NOT");
    }

    const left = this.consume(TokenType.Identifier).value;

    const opToken = this.peek();
    let comparator: string;
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

    return {
      type: "Simple",
      left,
      comparator,
      right,
      negated,
    };
  }

  // ----------------------------------------------------------
  // PARALLEL
  // ----------------------------------------------------------
  private parseParallel(insideStep: boolean): ParallelNode {
    const start = this.consume(TokenType.Keyword, "PARALLEL");
    if (!insideStep) {
      throw new ParserError("PARALLEL is only allowed inside a step block", start.line);
    }
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
      block = this.parseBlock(insideStep);
      this.consume(TokenType.Symbol, "}");
    } else {
      this.consume(TokenType.Symbol, ":");
      block = this.parseBlock(insideStep);
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
  // EACH <identifier> [WITH index?] IN <identifier> { ... }
  // ----------------------------------------------------------
  private parseEach(insideStep: boolean): EachNode {
    const kw = this.consume(TokenType.Keyword, "EACH");
    if (!insideStep) {
      throw new ParserError("EACH is only allowed inside a step block", kw.line);
    }
    const line = kw.line;

    let iterator: string;
    let indexVar: string | undefined;

    if (this.match(TokenType.Symbol, "(")) {
      this.consume(TokenType.Symbol, "(");
      iterator = this.consumeIdentifier();
      if (this.match(TokenType.Symbol, ",")) {
        this.consume(TokenType.Symbol, ",");
        indexVar = this.consumeIdentifier();
      }
      this.consume(TokenType.Symbol, ")");
    } else {
      iterator = this.consumeIdentifier();
    }

    this.consume(TokenType.Keyword, "IN");
    const iterable = this.consumeIdentifier();

    this.consume(TokenType.Symbol, "{");
    const block = this.parseBlock(insideStep);
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
  private parseStop(insideStep: boolean): StopNode {
    const kw = this.consume(TokenType.Keyword, "STOP");
    if (!insideStep) {
      throw new ParserError("STOP is only allowed inside a step block", kw.line);
    }
    return { type: "Stop", line: kw.line };
  }

  private parseSkip(insideStep: boolean): SkipNode {
    const kw = this.consume(TokenType.Keyword, "SKIP");
    if (!insideStep) {
      throw new ParserError("SKIP is only allowed inside a step block", kw.line);
    }
    return { type: "Skip", line: kw.line };
  }

  private parseReturn(insideStep: boolean): ReturnNode {
    const kw = this.consume(TokenType.Keyword, "RETURN");
    if (!insideStep) {
      throw new ParserError("RETURN is only allowed inside a step block", kw.line);
    }
    const entries: ReturnEntry[] = [];

    while (true) {
      if (!this.match(TokenType.Identifier)) break;
      const key = this.consumeIdentifier();
      if (!this.check(TokenType.Symbol, "=")) {
        throw new ParserError("return requires 'key=expression'", this.peek().line);
      }
      this.consume(TokenType.Symbol, "=");
      const expression = this.parseExpression();
      entries.push({ key, expression });

      const next = this.peek();
      if (
        next.type === TokenType.Identifier &&
        this.peek(1).type === TokenType.Symbol &&
        this.peek(1).value === "="
      ) {
        continue;
      }
      break;
    }

    if (!entries.length) {
      throw new ParserError("return requires at least one value", kw.line);
    }

    return {
      type: "Return",
      entries,
      line: kw.line,
    };
  }
}
