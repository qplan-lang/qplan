// ========== Core Types ==========
export type TokenType =
  | "KEYWORD"
  | "IDENT"
  | "STRING"
  | "NUMBER"
  | "ARROW"
  | "EQUAL"
  | "NEWLINE"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
}
