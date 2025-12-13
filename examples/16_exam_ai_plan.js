// 실행 전 OPENAI_API_KEY 환경 변수를 설정해야 합니다.
// 예) macOS/Linux: export OPENAI_API_KEY="sk-..."
//     PowerShell  : $env:OPENAI_API_KEY = "sk-..."

import OpenAI from "openai";
import { buildAIPlanPrompt, runQplan, validateQplanScript } from "../dist/index.js";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY 환경 변수를 먼저 설정하세요.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const requirement = `
./examples/nums.txt 파일에서 숫자를 읽어서 합계와 평균을 계산하고,
평균이 5 이상이면 "상위 점수"를, 아니면 "추가 학습 필요"를 출력해줘.
`;

// 1) buildAIPlanPrompt 로 AI 요청 프롬프트 자동 생성
const prompt = buildAIPlanPrompt(requirement);

console.log("============= buildAIPlanPrompt PROMPT ==================");
console.log(prompt);
console.log("============= buildAIPlanPrompt PROMPT end ==================");

// 2) OpenAI 호출 → 순수 QPlan 스크립트 획득
// const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"; // 잘 안됨
const model = process.env.OPENAI_MODEL ?? "gpt-4.1";

let aiScript = "";            // LLM이 생성한 qplan스크립트
const maxRetries = 3;         // 최대 재시도 횟수
let lastErrorMessage = "";

for (let attempt = 1; attempt <= maxRetries; attempt++) {
  if(attempt > 1) {
    console.log(`=========== 재시도중 (${attempt}) ===================`);
  }
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: "You are a senior QPlan planner. Return only valid QPlan code." },
      { role: "user", content: attempt === 1 ? prompt : `${prompt}\n\n이전 시도에서 실패한 이유: ${lastErrorMessage}\n위 에러를 반드시 수정한 새 QPlan만 출력하세요.` }
    ]
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  // console.log(`raw (attempt ${attempt}):`, JSON.stringify(raw));

  aiScript = raw.trim();

  if (!aiScript) {
    lastErrorMessage = "AI가 빈 스크립트를 반환했습니다.";
    continue;
  }

  console.log("====== AI가 생성한 QPlan ======");
  console.log(aiScript);

  const validation = validateQplanScript(aiScript);
  if (validation.ok) {
    break;
  }

  lastErrorMessage = `line ${validation.line ?? "?"}: ${validation.error}`;
  if (validation.issues?.length) {
    const issues = validation.issues.map(issue => `line ${issue.line}: ${issue.message}`).join(", ");
    lastErrorMessage += ` (details: ${issues})`;
  }
  console.error(`유효하지 않은 QPlan 스크립트입니다 (attempt ${attempt}).`, lastErrorMessage);

  if (attempt === maxRetries) {
    console.error("최대 재시도 횟수를 초과했습니다.");
    process.exit(1);
  }
}

// 4) 검증을 통과했으면 실행 (stepEvents 로 진행 로그 출력)
const ctx = await runQplan(aiScript, {
  stepEvents: {
    async onStepStart(info) {
      console.log(`[STEP START] ${info.stepId}${info.desc ? ` (${info.desc})` : ""}`);
    },
    async onStepEnd(info) {
      console.log(`[STEP END] ${info.stepId}${info.desc ? ` (${info.desc})` : ""}`);
    }
  }
});

console.log("====== 실행 결과 컨텍스트 ======");
console.log(ctx.toJSON());
