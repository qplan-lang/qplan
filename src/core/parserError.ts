/**
 * ParserError
 * -----------
 * 파싱 과정에서 발생하는 오류를 표현하는 에러 타입.
 * QPlan 문법이 잘못되었을 때 Parser가 이 에러를 던진다.
 */

export class ParserError extends Error {
  line: number;

  constructor(message: string, line: number) {
    super(`ParserError (line ${line}): ${message}`);
    this.line = line;
    this.name = "ParserError";
  }
}
