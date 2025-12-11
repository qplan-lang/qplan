import { runQplan } from "../dist/index.js";

/**
 * 파일 읽기 → 평균 → 조건문 → 결과 출력
 */
const script = `
future delay=3000 value="A" -> f1
future delay=6000 value="B" -> f2
join futures="f1,f2" -> out
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
