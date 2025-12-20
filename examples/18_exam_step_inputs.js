import { runQplan } from "../dist/index.js";

/**
 * Example: Step outputs reused as later action inputs
 * - 각 step 의 결과를 ctx 에 저장하고 이후 step 에서 변수나 stepID.필드 형태로 재사용
 * - 최근 executor 수정으로 identifier 인자들이 자동으로 실제 ctx 값으로 치환되는 흐름을 보여준다
 */
const script = `
step id="fetch_basic" desc="기본 주가 정보 수집" {
  var {"code":"005930","name":"삼성전자","price":78000} -> basicInfo
  print label="기본정보 저장" info=basicInfo
}

step id="fetch_news" desc="헤드라인 수집" {
  var ["실적 호조 기대","AI 투자 지속","메모리 업황 개선"] -> newsList
  print label="뉴스 목록" news=newsList
}

step id="summarize" desc="출력 확인" {
  print "=== 이전 step 결과 참조 ==="
  print basicInfo
  print viaStep=fetch_basic.basicInfo
  print newsArray=newsList

  json op="stringify" data=basicInfo space=2 -> basicJson
  json op="stringify" data=newsList -> newsSummary

  print basicJson=basicJson
  print newsSummary=newsSummary

  return basic=basicInfo news=fetch_news summary=newsSummary
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
