/**
 * QPlan Tokenizer
 * --------------------------------------
 * QPlan script 문자열을 토큰(Token) 단위로 분해하는 단계.
 * Parser는 Tokenizer가 생성한 토큰을 기반으로 AST를 만든다.
 *
 * 지원되는 토큰 종류:
 *  - Identifier (단어)
 *  - String ("문자열")
 *  - Number (123, 12.5)
 *  - Keyword (IF, ELSE, END, PARALLEL, USING, EACH, AS, IN, STOP, SKIP, AND, OR, NOT, SET, WHILE)
 *  - Symbol (=, ->, :, ,, @)
 */

export enum TokenType {
  Identifier = "Identifier",
  String = "String",
  Number = "Number",
  Keyword = "Keyword",
  Symbol = "Symbol",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

const KEYWORDS = new Set([
  "IF",
  "ELSE",
  "END",
  "PARALLEL",
  "USING",
  "EACH",
  "AS",
  "IN",
  "STOP",
  "SKIP",
  "AND",
  "OR",
  "NOT",
  "SET",
  "WHILE",
  "STEP",
  "JUMP",
  "RETURN",
]);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;

  const RE_ALPHA = /[\p{L}_]/u;
  const RE_ALPHA_NUM = /[\p{L}\p{N}_]/u;
  const isAlpha = (c: string) => RE_ALPHA.test(c);
  const isNum = (c: string) => /[0-9]/.test(c);
  const isAlphaNum = (c: string) => RE_ALPHA_NUM.test(c);

  while (i < input.length) {
    let c = input[i];

    // Newline
    if (c === "\n") {
      line++;
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // Comment (# ...)
    if (c === "#") {
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    // Line/Block comments starting with // or /* */
    if (c === "/") {
      const next = input[i + 1];
      if (next === "/") {
        i += 2;
        while (i < input.length && input[i] !== "\n") i++;
        continue;
      }
      if (next === "*") {
        i += 2;
        let closed = false;
        while (i < input.length) {
          const ch = input[i];
          if (ch === "\n") {
            line++;
            i++;
            continue;
          }
          if (ch === "*" && i + 1 < input.length && input[i + 1] === "/") {
            i += 2;
            closed = true;
            break;
          }
          i++;
        }
        if (!closed) {
          throw new Error(`Tokenizer error at line ${line}: unterminated block comment`);
        }
        continue;
      }
    }

    // String "..."
    if (c === '"') {
      i++;
      let str = "";
      while (i < input.length && input[i] !== '"') {
        str += input[i++];
      }
      i++; // closing "
      tokens.push({ type: TokenType.String, value: str, line });
      continue;
    }

    // Number
    if (isNum(c)) {
      let num = "";
      while (i < input.length && (isNum(input[i]) || input[i] === ".")) {
        num += input[i++];
      }
      tokens.push({ type: TokenType.Number, value: num, line });
      continue;
    }

    // Identifier or Keyword
    if (isAlpha(c)) {
      let word = "";
      while (i < input.length && isAlphaNum(input[i])) {
        word += input[i++];
      }

      if (KEYWORDS.has(word.toUpperCase())) {
        tokens.push({
          type: TokenType.Keyword,
          value: word.toUpperCase(),
          line,
        });
      } else {
        tokens.push({ type: TokenType.Identifier, value: word, line });
      }
      continue;
    }

    // Comparison operators: > < >= <= == !=
    if (c === ">" || c === "<" || c === "=" || c === "!") {
      let op = c;
      if (i + 1 < input.length && input[i + 1] === "=") {
        op += "=";
        i++;
      }
      tokens.push({ type: TokenType.Symbol, value: op, line });
      i++;
      continue;
    }
    
    // Braces/parentheses/brackets
    if (c === "{" || c === "}" || c === "(" || c === ")" || c === "[" || c === "]") {
      tokens.push({ type: TokenType.Symbol, value: c, line });
      i++;
      continue;
    }

    // Simple symbols (=, :, ,, ., @) — keep after comparison rule
    if (c === ":" || c === "," || c === "." || c === "@") {
      tokens.push({ type: TokenType.Symbol, value: c, line });
      i++;
      continue;
    }

    // Arrow (->) or minus symbol
    if (c === "-") {
      if (input[i + 1] === ">") {
        tokens.push({ type: TokenType.Symbol, value: "->", line });
        i += 2;
        continue;
      }
      tokens.push({ type: TokenType.Symbol, value: "-", line });
      i++;
      continue;
    }

    if (c === "+" || c === "*" || c === "/") {
      tokens.push({ type: TokenType.Symbol, value: c, line });
      i++;
      continue;
    }

    throw new Error(
      `Tokenizer error at line ${line}: unexpected character '${c}'`
    );
  }

  tokens.push({ type: TokenType.EOF, value: "EOF", line });
  return tokens;
}
