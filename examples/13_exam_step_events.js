import { runQplan } from "../dist/index.js";

/**
 * Example: log step execution via stepEvents hooks
 */
const script = `
step id="prepare" desc="Prepare data" {
  var 0 -> total
  var [1,2,3] -> nums
}

step id="sum" desc="Sum" -> sumResult {
  each n in nums {
    math add a=total b=n -> total
  }
}

step id="branch" desc="Branch" {
  if total >= 3 {
    jump to="final"
  }
  print "branch continued"
}

step id="final" desc="Finalize" {
  print total
  print sumResult
  return summary=sumResult
}
`;

const ctx = await runQplan(script, {
  stepEvents: {
    async onStepStart(info) {
      console.log("▶ start:", info.desc ?? info.stepId, "-", info.path.join(" > "));
    },
    async onStepEnd(info, result) {
      console.log("✔ end:", info.desc ?? info.stepId, "result:", result);
    },
    async onStepError(info, error) {
      console.log("✖ error:", info.desc ?? info.stepId, error.message);
    },
    async onStepRetry(info, attempt, error) {
      console.log("↻ retry:", info.desc ?? info.stepId, "attempt", attempt, "-", error.message);
    },
    async onStepJump(info, targetStepId) {
      console.log("➜ jump:", info.desc ?? info.stepId, "→", targetStepId);
    },
  },
});

console.log(ctx.toJSON());
