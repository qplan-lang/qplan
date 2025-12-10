// src/core/tokenizer.ts

export enum TokenType {
  Keyword = "Keyword",
  Identifier = "Identifier",
  Number = "Number",
  String = "String",
  Arrow = "Arrow",        // ->
  Equals = "Equals",      // =
  Comma = "Comma",        // ,
  Colon = "Colon",        // :
  Comparator = "Comparator", // >, <, >=, <=, ==, !=, EXISTS, NOT_EXISTS
  Newline = "Newline",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

export class TokenizerError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`${message} (line ${line}, col ${col})`);
    this.name = "TokenizerError";
  }
}

// DSL 키워드 / 비교 연산자
const KEYWORDS = new Set([
  "FETCH",
  "CALL",
  "CALC",
  "AI",
  "IF",
  "ELSE",
  "END",
  "PARALLEL",
  "USING",
]);

const COMPARATORS = new Set([
  ">",
  "<",
  ">=",
  "<=",
  "==",
  "!=",
]);

const WORD_COMPARATORS = new Set(["EXISTS", "NOT_EXISTS"]);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const length = input.length;

  const push = (type: TokenType, value: string) => {
    tokens.push({ type, value, line, col });
  };

  while (i < length) {
    const ch = input[i];

    // 줄바꿈
    if (ch === "\n") {
      push(TokenType.Newline, "\n");
      i++;
      line++;
      col = 1;
      continue;
    }

    // 공백
    if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      col++;
      continue;
    }

    // 주석: # 로 시작하면 줄 끝까지 스킵
    if (ch === "#") {
      while (i < length && input[i] !== "\n") {
        i++;
        col++;
      }
      continue;
    }

    // 화살표 ->
    if (ch === "-" && input[i + 1] === ">") {
      push(TokenType.Arrow, "->");
      i += 2;
      col += 2;
      continue;
    }

    // 비교 연산자 (두 글자 먼저 체크)
    if (ch === ">" || ch === "<" || ch === "=" || ch === "!") {
      const two = input.substring(i, i + 2);
      if (COMPARATORS.has(two)) {
        push(TokenType.Comparator, two);
        i += 2;
        col += 2;
        continue;
      }

      if (COMPARATORS.has(ch)) {
        push(TokenType.Comparator, ch);
        i++;
        col++;
        continue;
      }

      if (ch === "=") {
        push(TokenType.Equals, "=");
        i++;
        col++;
        continue;
      }

      throw new TokenizerError(`Unexpected character '${ch}'`, line, col);
    }

    // 단순 = (위에서 == 처리됨)
    if (ch === "=") {
      push(TokenType.Equals, "=");
      i++;
      col++;
      continue;
    }

    // 구분자 , :
    if (ch === ",") {
      push(TokenType.Comma, ",");
      i++;
      col++;
      continue;
    }

    if (ch === ":") {
      push(TokenType.Colon, ":");
      i++;
      col++;
      continue;
    }

    // 숫자
    if (isDigit(ch)) {
      const startCol = col;
      let start = i;
      while (i < length && isDigit(input[i])) {
        i++;
        col++;
      }
      const value = input.substring(start, i);
      tokens.push({
        type: TokenType.Number,
        value,
        line,
        col: startCol,
      });
      continue;
    }

    // 식별자 / 키워드 / 단어형 비교연산자(EXISTS, NOT_EXISTS)
    if (isIdentifierStart(ch)) {
      const startCol = col;
      let start = i;
      i++;
      col++;
      while (i < length && isIdentifierPart(input[i])) {
        i++;
        col++;
      }
      const raw = input.substring(start, i);
      const upper = raw.toUpperCase();

      if (WORD_COMPARATORS.has(upper)) {
        tokens.push({
          type: TokenType.Comparator,
          value: upper,
          line,
          col: startCol,
        });
      } else if (KEYWORDS.has(upper)) {
        tokens.push({
          type: TokenType.Keyword,
          value: upper,
          line,
          col: startCol,
        });
      } else {
        tokens.push({
          type: TokenType.Identifier,
          value: raw,
          line,
          col: startCol,
        });
      }
      continue;
    }

    // 문자열 "..."
    if (ch === '"') {
      const startCol = col;
      i++; // opening quote
      col++;
      let value = "";
      let closed = false;

      while (i < length) {
        const c = input[i];

        if (c === '"') {
          closed = true;
          i++;
          col++;
          break;
        }

        if (c === "\\") {
          const next = input[i + 1];
          if (next === '"' || next === "\\" || next === "n" || next === "t") {
            if (next === "n") value += "\n";
            else if (next === "t") value += "\t";
            else value += next;
            i += 2;
            col += 2;
          } else {
            // 그냥 문자로 취급
            value += c;
            i++;
            col++;
          }
        } else if (c === "\n") {
          throw new TokenizerError(
            "Unterminated string literal",
            line,
            startCol
          );
        } else {
          value += c;
          i++;
          col++;
        }
      }

      if (!closed) {
        throw new TokenizerError(
          "Unterminated string literal",
          line,
          startCol
        );
      }

      tokens.push({
        type: TokenType.String,
        value,
        line,
        col: startCol,
      });
      continue;
    }

    // 알 수 없는 문자
    throw new TokenizerError(`Unexpected character '${ch}'`, line, col);
  }

  tokens.push({ type: TokenType.EOF, value: "", line, col });
  return tokens;
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isIdentifierStart(ch: string): boolean {
  return (
    (ch >= "A" && ch <= "Z") ||
    (ch >= "a" && ch <= "z") ||
    ch === "_"
  );
}

function isIdentifierPart(ch: string): boolean {
  return isIdentifierStart(ch) || isDigit(ch);
}
