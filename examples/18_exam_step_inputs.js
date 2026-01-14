import { runQplan } from "../dist/index.js";

/**
 * Example: Step outputs reused as later action inputs
 * - Store results of each step in ctx and reuse as variable or stepID.field in later steps
 * - Demonstrates the flow where identifier arguments are automatically replaced with actual ctx values due to recent executor updates
 */
const script = `
step id="fetch_basic" desc="Collect basic stock info" {
  var {"code":"005930","name":"Samsung Electronics","price":78000} -> basicInfo
  print label="Save basic info" info=basicInfo
}

step id="fetch_news" desc="Collect headlines" {
  var ["Earnings surprise expected","AI investment continues","Memory market recovery"] -> newsList
  print label="News list" news=newsList
}

step id="summarize" desc="Check output" {
  print "=== Referencing previous step results ==="
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
