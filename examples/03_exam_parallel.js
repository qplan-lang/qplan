import { runQplan } from "../dist/index.js";

/**
 * 파일 읽기 → 평균 → 조건문 → 결과 출력
 */
const script = `
parallel concurrency=3 {
    sleep ms=300 -> a
    sleep ms=100 -> b
    sleep ms=500 -> c
} -> done
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
