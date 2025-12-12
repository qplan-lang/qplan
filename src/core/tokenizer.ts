/**
 * qplan Tokenizer
 * --------------------------------------
 * DSL 문자열을 토큰(Token) 단위로 분해하는 단계.
 * Parser는 Tokenizer가 생성한 토큰을 기반으로 AST를 만든다.
 *
 * 지원되는 토큰 종류:
 *  - Identifier (단어)
 *  - String ("문자열")
 *  - Number (123, 12.5)
 *  - Keyword (IF, ELSE, END, PARALLEL, USING, EACH, AS, IN, STOP, SKIP, AND)
 *  - Symbol (=, ->, :, ,, )
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

const KEYWORDS = new Set(["IF", "ELSE", "END", "PARALLEL", "USING", "EACH", "AS", "IN", "STOP", "SKIP", "AND", "OR", "NOT"]);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;

  const isAlpha = (c: string) => /[a-zA-Z_]/.test(c);
  const isNum = (c: string) => /[0-9]/.test(c);
  const isAlphaNum = (c: string) => /[a-zA-Z0-9_]/.test(c);

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
    
    // Braces { } and parentheses ( )
    if (c === "{" || c === "}" || c === "(" || c === ")" || c === "[" || c === "]") {
      tokens.push({ type: TokenType.Symbol, value: c, line });
      i++;
      continue;
    }

    // Simple symbols (=, :, ,,) — keep after comparison rule
    if (c === ":" || c === ",") {
      tokens.push({ type: TokenType.Symbol, value: c, line });
      i++;
      continue;
    }

    // Arrow (->)
    if (c === "-" && input[i + 1] === ">") {
      tokens.push({ type: TokenType.Symbol, value: "->", line });
      i += 2;
      continue;
    }

    throw new Error(
      `Tokenizer error at line ${line}: unexpected character '${c}'`
    );
  }

  tokens.push({ type: TokenType.EOF, value: "EOF", line });
  return tokens;
}
