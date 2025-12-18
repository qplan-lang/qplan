import { runQplan } from "../dist/index.js";

/**
 * Example: Unicode step IDs and namespaces.
 * Demonstrates Korean identifiers for step id, action outputs, and return keys.
 */
const script = `
step id="기본준비" desc="기본 값 세팅" type="single" -> 준비결과 {
  var 1 -> 초기값
  var 2 -> 추가값
  return 초기값=초기값 추가값=추가값
}

step id="계산" desc="간단 계산" type="single" -> 계산결과 {
  math add a=준비결과.초기값 b=준비결과.추가값 -> 합계
  math mul a=합계 b=2 -> 두배
  return 합계=합계, 두배=두배
}

step id="보고" desc="한글 네임스페이스 접근" type="single" -> 보고서 {
  print "합계:" 계산결과.합계
  print "두배:" 계산결과.두배
  return 요약="완료", 합계=계산결과.합계 두배=계산결과.두배
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
