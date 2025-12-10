import { runQplan } from "../dist/index.js";

const script = `
# 파일 읽기
FETCH file path="examples/math.txt" -> content

# AI에게 문제 풀기 시키기
AI "이 파일에 있는 수학문제의 답만 알려줘" USING content -> answer
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
