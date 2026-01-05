import { tokenize } from "./tokenizer.js";
import { Parser } from "./parser.js";
import { validateSemantics } from "./semanticValidator.js";
import { ParserError } from "./parserError.js";
import type { ASTRoot } from "./ast.js";
import type { SemanticIssue } from "./semanticValidator.js";

export type QplanValidationResult =
  | { ok: true; ast: ASTRoot }
  | { ok: false; error: string; line?: number; issues?: SemanticIssue[] };

export function validateScript(script: string): QplanValidationResult {
  try {
    const tokens = tokenize(script);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const semanticIssues = validateSemantics(ast);
    if (semanticIssues.length > 0) {
      const first = semanticIssues[0];
      return {
        ok: false,
        error: first.message,
        line: first.line,
        issues: semanticIssues,
      };
    }
    return { ok: true, ast };
  } catch (err) {
    if (err instanceof ParserError) {
      return { ok: false, error: err.message, line: err.line };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Unknown validation error" };
  }
}
