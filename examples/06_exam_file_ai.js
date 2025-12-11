// 실행 전 터미널에서 OPENAI_API_KEY 환경 변수를 설정해야 합니다.
// 예) PowerShell: $env:OPENAI_API_KEY="sk-..."

import { runQplan, registry } from "../dist/index.js";
import { aiModule } from "../dist/modules/basic/ai.js";

/**
 * 파일 읽기 → 평균 → 조건문 → 결과 출력
 */

// ai 모듈이 기본 등록 목록에 없으므로 사용 전에 명시적으로 등록
registry.register(aiModule);

const script = `
file read path="./examples/math.txt" -> math_exam
ai prompt="이 수학문제의 정답만 알려줘" context=math_exam -> answer
echo msg=answer -> out
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
