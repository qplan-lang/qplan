import { runQplan } from "../dist/index.js";

/**
 * 파일 읽기 → 평균 → 조건문 → 결과 출력
 */
const script = `
file op="read" path="./nums.txt" -> raw
math op="avg" arr=raw -> avg

if avg > 50 {
    echo msg="HIGH" -> result
} else {
    echo msg="LOW" -> result
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
