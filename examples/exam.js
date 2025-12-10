import { runQplan } from "../dist/index.js";

const script = `
FETCH price stock=005930 days=30 -> price
CALC ma20 price -> ma20
AI "20일선 분석" USING price, ma20 -> out
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
