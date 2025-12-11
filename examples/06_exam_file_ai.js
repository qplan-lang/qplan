import { runQplan } from "../dist/index.js";

/**
 * 파일 읽기 → 평균 → 조건문 → 결과 출력
 */
const script = `
file op="read" path="./math.txt" -> math_exam
ai prompt="이 수학문제의 정답만 알려줘" context=math_exam -> answer
echo msg=answer -> out
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
