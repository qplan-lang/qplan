/**
 * QPlan Parser
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
  BreakNode,
  ContinueNode,
  StopNode,
  SkipNode,
  SetNode,
  VarNode,
  StepNode,
  JumpNode,
  ReturnNode,
  ReturnEntry,
  ConditionClause,
  ConditionExpression,
  ExpressionNode,
  PlanMeta
} from "./ast.js";
import { ParserError } from "./parserError.js";
import { isValidStepId } from "../step/stepId.js";

export class Parser {
  private pos = 0;
  private printTempVar = 0;
  private autoTempVar = 0;

  constructor(private tokens: Token[]) { }

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

  private consumeIdentifierPath(): string {
    let name = this.consumeIdentifier();
    while (true) {
      if (this.check(TokenType.Symbol, ".")) {
        this.consume(TokenType.Symbol, ".");
        const next = this.consumeIdentifier();
        name += `.${next}`;
        continue;
      }
      if (this.check(TokenType.Symbol, "[")) {
        this.consume(TokenType.Symbol, "[");
        const t = this.peek();
        let next: string;
        if (t.type === TokenType.Number) {
          next = this.consume(TokenType.Number).value;
        } else if (t.type === TokenType.Identifier) {
          next = this.consume(TokenType.Identifier).value;
        } else if (t.type === TokenType.String) {
          next = this.consumeString();
        } else {
          throw new ParserError(`Invalid bracket access '${t.value}'`, t.line);
        }
        this.consume(TokenType.Symbol, "]");
        name += `.${next}`;
        continue;
      }
      break;
    }
    return name;
  }

  private consumeString(): string {
    return this.consume(TokenType.String).value;
  }

  private consumeValueAny(): any {
    return this.consumeValueWithKind().value;
  }

  private consumeValueWithKind():
    | { value: any; kind: "string" }
    | { value: any; kind: "number" }
    | { value: any; kind: "identifier" }
    | { value: any; kind: "boolean" }
    | { value: any; kind: "json" }
    | { value: any; kind: "null" }
    | { value: any; kind: "expression" } {
    const t = this.peek();
    if (t.type === TokenType.Boolean) {
      return { value: this.consume(TokenType.Boolean).value === "true", kind: "boolean" };
    }
    if (t.type === TokenType.Null) {
      this.consume(TokenType.Null);
      return { value: null, kind: "null" };
    }
    if (t.type === TokenType.String) {
      return { value: this.consumeString(), kind: "string" };
    }
    if (t.type === TokenType.Number) {
      return {
        value: Number(this.consume(TokenType.Number).value),
        kind: "number",
      };
    }
    if (t.type === TokenType.Identifier) {
      return { value: this.consumeIdentifierPath(), kind: "identifier" };
    }
    if (t.type === TokenType.Symbol && (t.value === "[" || t.value === "{")) {
      return { value: this.parseJsonLiteralValue(), kind: "json" };
    }
    // Support parenthesized expressions in arguments: key=(a + b)
    if (t.type === TokenType.Symbol && t.value === "(") {
      const expr = this.parseExpression();
      return { value: expr, kind: "expression" };
    }
    throw new ParserError(`Unexpected value '${t.value}'`, t.line);
  }

  // ----------------------------------------------------------
  // Root
  // ----------------------------------------------------------
  parse(): ASTRoot {
    if (this.isPlanStart()) {
      const { block, meta } = this.parsePlan();
      return {
        type: "Root",
        block,
        planMeta: meta,
      };
    }
    if (this.check(TokenType.Symbol, "@")) {
      const meta = this.parsePlanMeta();
      const block = this.parseBlock(false);
      return {
        type: "Root",
        block,
        planMeta: meta,
      };
    }
    const block = this.parseBlock(false);
    return {
      type: "Root",
      block,
    };
  }

  private isPlanStart(): boolean {
    const t = this.peek();
    if (t.type === TokenType.Keyword && t.value === "PLAN") return true;
    if (t.type === TokenType.Identifier && t.value.toLowerCase() === "plan") return true;
    return false;
  }

  private parsePlan(): { block: BlockNode; meta?: PlanMeta } {
    if (this.match(TokenType.Keyword, "PLAN")) {
      this.consume(TokenType.Keyword, "PLAN");
    } else {
      const name = this.consumeIdentifier();
      if (name.toLowerCase() !== "plan") {
        throw new ParserError(`Unexpected token '${name}'`, this.peek().line);
      }
    }
    this.consume(TokenType.Symbol, "{");
    const meta = this.parsePlanMeta();
    const block = this.parseBlock(false);
    this.consume(TokenType.Symbol, "}");
    return { block, meta };
  }

  private parsePlanMeta(): PlanMeta | undefined {
    const meta: PlanMeta = {};
    while (this.check(TokenType.Symbol, "@")) {
      const marker = this.consume(TokenType.Symbol, "@");
      if (!this.match(TokenType.Identifier)) {
        throw new ParserError("plan meta requires @<key> \"value\"", marker.line);
      }
      const key = this.consumeIdentifier();
      const normalized = key.toLowerCase();
      if (!["title", "summary", "version", "since", "params"].includes(normalized)) {
        throw new ParserError(`Unknown plan meta '@${key}'`, marker.line);
      }
      meta[normalized as keyof PlanMeta] = this.parsePlanMetaValue();
    }
    return Object.keys(meta).length ? meta : undefined;
  }

  private parsePlanMetaValue(): string {
    const token = this.peek();
    if (token.type === TokenType.String) {
      return this.consumeString();
    }
    return this.consumePlanMetaLine();
  }

  private consumePlanMetaLine(): string {
    const start = this.peek();
    const startLine = start.line;
    const tokens: Token[] = [];

    while (true) {
      const token = this.peek();
      if (token.type === TokenType.EOF) break;
      if (token.line !== startLine) break;
      if (token.type === TokenType.Symbol && token.value === "@") break;
      tokens.push(token);
      this.pos++;
    }

    if (!tokens.length) {
      throw new ParserError(`Invalid plan meta value '${start.value}'`, start.line);
    }

    const glueSymbols = new Set([".", "-", "_", ":", "/", "+", ","]);
    let result = "";
    let prevGlue = false;

    for (const token of tokens) {
      const text = this.planMetaTokenText(token);
      const isGlue = token.type === TokenType.Symbol && glueSymbols.has(token.value);
      if (result && !prevGlue && !isGlue) {
        result += " ";
      }
      result += text;
      prevGlue = isGlue;
    }
    return result;
  }

  private planMetaTokenText(token: Token): string {
    switch (token.type) {
      case TokenType.String:
      case TokenType.Number:
      case TokenType.Identifier:
      case TokenType.Symbol:
        return token.value;
      case TokenType.Boolean:
        return token.value === "true" ? "true" : "false";
      case TokenType.Null:
        return "null";
      case TokenType.Keyword:
        return token.value.toLowerCase();
      default:
        return token.value;
    }
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

    // BREAK (루프 탈출)
    if (this.match(TokenType.Keyword, "BREAK")) return this.parseBreak();

    // CONTINUE (루프 다음 반복)
    if (this.match(TokenType.Keyword, "CONTINUE")) return this.parseContinue();

    // STOP (Plan 전체 중단)
    if (this.match(TokenType.Keyword, "STOP")) return this.parseStop();

    // SKIP (Step 건너뛰기)
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

    // VAR
    if (this.check(TokenType.Identifier, "var")) return this.parseVar();

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

    /*
    if (!insideStep) {
      throw new ParserError("Actions must be inside a step block", line);
    }
    */

    if (moduleName === "print") {
      return this.parsePrintAction(moduleName, line);
    }

    const args: Record<string, any> = {};
    const identifierRefs = new Set<string>();
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
        vars.forEach(v => identifierRefs.add(v));
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
        line,
        argRefs: identifierRefs.size ? Array.from(identifierRefs) : undefined,
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
        const consumed = this.consumeValueWithKind();
        const value = consumed.value;
        args[key] = value;
        if (consumed.kind === "identifier" && typeof value === "string") {
          identifierRefs.add(value);
        }
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
      argRefs: identifierRefs.size ? Array.from(identifierRefs) : undefined,
    };
  }

  private parseSet(insideStep: boolean): SetNode {
    const kw = this.consume(TokenType.Keyword, "SET");
    /*
    if (!insideStep) {
      throw new ParserError("SET is only allowed inside a step block", kw.line);
    }
    */
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

  private parseVar(): VarNode {
    const kw = this.consume(TokenType.Identifier, "var");
    const line = kw.line;
    const expression = this.parseExpression();

    if (!this.check(TokenType.Symbol, "->")) {
      throw new ParserError("var requires '-> outputVar'", line);
    }
    this.consume(TokenType.Symbol, "->");
    const variable = this.consumeIdentifier();

    return {
      type: "Var",
      variable,
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
    let outputVar: string | undefined;

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

    if (!id) {
      throw new ParserError("step requires id=\"<identifier>\"", line);
    }
    if (!isValidStepId(id)) {
      throw new ParserError(
        `Invalid step id '${id}'. Use letters (Unicode supported), digits, or underscore; start with a letter or underscore.`,
        line
      );
    }

    if (this.check(TokenType.Symbol, "->")) {
      this.consume(TokenType.Symbol, "->");
      outputVar = this.consumeIdentifier();
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
      output: outputVar,
      block,
      line,
    };
  }

  private parseJump(insideStep: boolean): JumpNode {
    const kw = this.consume(TokenType.Keyword, "JUMP");
    /*
    if (!insideStep) {
      throw new ParserError("JUMP is only allowed inside a step block", kw.line);
    }
    */
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
      if (this.check(TokenType.Symbol, "{")) {
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
    const identifierRefs: string[] = [];
    for (const entry of entries as any[]) {
      if (entry.kind === "identifier" && typeof entry.name === "string") {
        identifierRefs.push(entry.name);
      } else if (entry.kind === "kv" && typeof entry.refName === "string") {
        identifierRefs.push(entry.refName);
      } else if (entry.kind === "expression" && entry.value) {
        this.extractIdentifiers(entry.value, identifierRefs);
      }
    }
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
      argRefs: identifierRefs.length ? identifierRefs : undefined,
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
        const consumed = this.consumeValueWithKind();
        entries.push({
          kind: "kv",
          key,
          value: consumed.value,
          refName: consumed.kind === "identifier" ? (consumed.value as string) : undefined,
        });
        continue;
      }

      // Expression parsing (includes String, Number, Identifier, and Operations)
      // BUT we must avoid consuming key=value keys (handled above)
      // So we use parseExpression but we need to ensure it doesn't eat into the next Argument if comma is missing?
      // Actually, print arguments are comma-separated or space-separated?
      // Implementation: parseExpression will consume as much as possible until it hits something it can't handle.
      // If we see Identifier=..., that's a KV.
      // Otherwise, try parsing an expression.
      try {
        const expr = this.parseExpression();
        // Since we don't have an easy way to evaluate expression during parse time without changing print Action schema,
        // we might need to wrap print to support runtime evaluation of these expressions?
        //
        // Wait, 'print' action currently takes raw values.
        // If we want 'print "A" + "B"', we need to pass that ExpressionNode to the action?
        // But ActionNode args are 'any'.
        // For now, let's keep it simple: if it's a "print" action, we might allow expression nodes in the args.
        // The current Executor 'execAction' resolves args. string/variable are resolved.
        // If we pass an ExpressionNode object, executor doesn't know how to handle it automatically unless we teach it.
        //
        // HOWEVER, the user asked for var ... -> ...
        // This change is for 'print' specially? The user example showed 'print "..." + ...'.
        // The error shows unexpected token '+'.
        // So yes, print needs to support expressions too.

        entries.push({ kind: "expression", value: expr });
        continue;
      } catch (e) {
        // If expression parsing fails, break
        break;
      }
    }

    return entries;
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
    if (token.type === TokenType.Boolean) {
      return {
        type: "Literal",
        value: this.consume(TokenType.Boolean).value === "true",
      };
    }
    if (token.type === TokenType.Null) {
      this.consume(TokenType.Null);
      return {
        type: "Literal",
        value: null,
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
        name: this.consumeIdentifierPath(),
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
    /*
    if (!insideStep) {
      throw new ParserError("IF is only allowed inside a step block", kw.line);
    }
    */
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

      if (this.match(TokenType.Keyword, "IF")) {
        // else if ... -> transform to else { if ... }
        const nestedIf = this.parseIf(insideStep);
        elseBlock = {
          type: "Block",
          statements: [nestedIf],
          line: nestedIf.line,
        };
      } else {
        this.consume(TokenType.Symbol, "{");
        elseBlock = this.parseBlock(insideStep);
        this.consume(TokenType.Symbol, "}");
      }
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
    /*
    if (!insideStep) {
      throw new ParserError("WHILE is only allowed inside a step block", kw.line);
    }
    */
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

  private hasComparisonInParen(): boolean {
    let pos = this.pos + 1; // start after '('
    let depth = 0;
    const len = this.tokens.length;

    while (pos < len) {
      const t = this.tokens[pos];
      if (t.type === TokenType.Symbol && t.value === "(") {
        depth++;
      } else if (t.type === TokenType.Symbol && t.value === ")") {
        if (depth === 0) return false; // End of paren, no comparator found
        depth--;
      } else {
        // Check for comparators at ANY depth
        if (t.type === TokenType.Symbol) {
          const val = t.value;
          if (
            val === ">" ||
            val === "<" ||
            val === ">=" ||
            val === "<=" ||
            val === "==" ||
            val === "!="
          )
            return true;
        } else if (t.type === TokenType.Identifier) {
          const val = t.value.toUpperCase();
          if (val === "EXISTS" || val === "NOT_EXISTS") return true;
        } else if (t.type === TokenType.Keyword) {
          const val = t.value.toUpperCase();
          if (val === "AND" || val === "OR" || val === "NOT") return true;
        }
      }
      pos++;
    }
    return false;
  }

  private parseConditionPrimary(): ConditionExpression {
    // Check for paren group around condition like IF (a > b)
    if (this.check(TokenType.Symbol, "(") && this.hasComparisonInParen()) {
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

    const line = this.peek().line;

    // Parse left side as expression
    const left = this.parseExpression();

    const opToken = this.peek();
    let comparator: string;
    if (opToken.type === TokenType.Symbol) {
      const validOps = [">", "<", ">=", "<=", "==", "!="];
      if (validOps.includes(opToken.value)) {
        comparator = this.consume(TokenType.Symbol).value;
      } else if (opToken.value === "{" || opToken.value === ")") {
        comparator = "TRUTHY";
      } else {
        throw new ParserError(`Invalid operator '${opToken.value}'`, opToken.line);
      }
    } else if (opToken.type === TokenType.Identifier) {
      const opId = this.consume(TokenType.Identifier).value.toUpperCase();
      const validIds = ["EXISTS", "NOT_EXISTS"];
      if (!validIds.includes(opId)) {
        throw new ParserError(`Invalid operator '${opId}'`, opToken.line);
      }
      comparator = opId;
    } else if (opToken.type === TokenType.Keyword) {
      const opValue = opToken.value.toUpperCase();
      if (opValue === "AND" || opValue === "OR") {
        comparator = "TRUTHY";
      } else {
        throw new ParserError(
          `Invalid operator token '${opToken.value}'`,
          opToken.line
        );
      }
    } else {
      throw new ParserError(
        `Invalid operator token '${opToken.value}'`,
        opToken.line
      );
    }

    // Parse right side as expression (for EXISTS/NOT_EXISTS, create a dummy literal)
    let right: ExpressionNode;
    if (comparator === "EXISTS" || comparator === "NOT_EXISTS" || comparator === "TRUTHY") {
      // For EXISTS/NOT_EXISTS, right side is not needed
      right = { type: "Literal", value: undefined };
    } else {
      right = this.parseExpression();
    }

    return {
      type: "Simple",
      left,
      comparator,
      right,
      negated,
      line,
    };
  }

  // ----------------------------------------------------------
  // PARALLEL
  // ----------------------------------------------------------
  private parseParallel(insideStep: boolean): ParallelNode {
    const start = this.consume(TokenType.Keyword, "PARALLEL");
    /*
    if (!insideStep) {
      throw new ParserError("PARALLEL is only allowed inside a step block", start.line);
    }
    */
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
    /*
    if (!insideStep) {
      throw new ParserError("EACH is only allowed inside a step block", kw.line);
    }
    */
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
    const iterable = this.consumeIdentifierPath();

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
  // BREAK / CONTINUE (루프 제어)
  // ----------------------------------------------------------
  private parseBreak(): BreakNode {
    const kw = this.consume(TokenType.Keyword, "BREAK");
    return { type: "Break", line: kw.line };
  }

  private parseContinue(): ContinueNode {
    const kw = this.consume(TokenType.Keyword, "CONTINUE");
    return { type: "Continue", line: kw.line };
  }

  // ----------------------------------------------------------
  // STOP / SKIP (Plan/Step 제어)
  // ----------------------------------------------------------
  private parseStop(): StopNode {
    const kw = this.consume(TokenType.Keyword, "STOP");
    return { type: "Stop", line: kw.line };
  }

  private parseSkip(insideStep: boolean): SkipNode {
    const kw = this.consume(TokenType.Keyword, "SKIP");
    /*
    if (!insideStep) {
      throw new ParserError("SKIP is only allowed inside a step block", kw.line);
    }
    */
    return { type: "Skip", line: kw.line };
  }

  private parseReturn(insideStep: boolean): ReturnNode {
    const kw = this.consume(TokenType.Keyword, "RETURN");
    /*
    if (!insideStep) {
      throw new ParserError("RETURN is only allowed inside a step block", kw.line);
    }
    */
    const entries: ReturnEntry[] = [];

    while (true) {
      if (this.check(TokenType.Symbol, ",")) {
        this.consume(TokenType.Symbol, ",");
        continue;
      }
      if (!this.match(TokenType.Identifier)) break;
      const key = this.consumeIdentifier();
      let expression: ExpressionNode;
      if (this.check(TokenType.Symbol, "=")) {
        this.consume(TokenType.Symbol, "=");
        expression = this.parseExpression();
      } else {
        expression = {
          type: "Identifier",
          name: key,
        };
      }
      entries.push({ key, expression });

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

  private extractIdentifiers(expr: ExpressionNode, refs: string[]) {
    switch (expr.type) {
      case "Identifier":
        refs.push(expr.name);
        break;
      case "BinaryExpression":
        this.extractIdentifiers(expr.left, refs);
        this.extractIdentifiers(expr.right, refs);
        break;
      case "UnaryExpression":
        this.extractIdentifiers(expr.argument, refs);
        break;
      default:
        break;
    }
  }
}
