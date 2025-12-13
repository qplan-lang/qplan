import { runQplan } from "../dist/index.js";

/**
 * Example: Step onError policies (fail | continue | retry | jump)
 */
const script = `
step id="init" desc="Init" {
  var 0 -> retryCounter
  print "Init complete"
}

step id="failExample" desc="Basic fail (demo)" onError="continue" {
  print "Fail example start"
  math add a=missingVar b=1 -> broken
  print "This line never runs"
}

step id="continueExample" desc="Continue policy" onError="continue" {
  print "Continue example start"
  math add a=missingVar b=1 -> broken
  print "Continue example end"
}

step id="retryExample" desc="Retry policy" onError="retry=2" -> retryResult {
  print "Retry example, current counter =" retryCounter
  if retryCounter < 1 {
    set retryCounter = retryCounter + 1
    math add a=missingVar b=1 -> broken
  }
  math add a=retryCounter b=10 -> ok
  return attempts=retryCounter result=ok
}

step id="jumpExample" desc="Jump policy" onError="jump='recovery'" {
  print "Jump example start"
  math add a=missingVar b=1 -> broken
}

step id="recovery" desc="Jump target" -> recoveryResult {
  print "Running recovery step"
  return message="Jump handled"
}

step id="summary" desc="Summary" {
  print "retry result:" retryResult
  print "recovery result:" recoveryResult
}
`;

try {
  const ctx = await runQplan(script);
  console.log(ctx.toJSON());
} catch (err) {
  console.error("Error while running script:", err?.message ?? err);
}
