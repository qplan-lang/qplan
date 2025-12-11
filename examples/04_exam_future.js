import { runQplan } from "../dist/index.js";

/**
 * 파일 읽기 → 평균 → 조건문 → 결과 출력
 */
const script = `
future delay=300 value="task-1" -> f1
future delay=700 value="task-2" -> f2
echo msg="started futures" -> ok
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
