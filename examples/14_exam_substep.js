import { runQplan } from "../dist/index.js";

/**
 * Example: nesting sub-steps inside a parent step
 */
const script = `
step id="pipeline" desc="Root pipeline" {
  var {"numbers": []} -> prepareResult
  var {"sum": 0} -> aggregateResult
  var {"message": "pending"} -> reportResult
  var {"status": "pending"} -> finalizeResult
  var 0 -> total

  step id="prepare" desc="Prepare data" {
    var [1,2] -> numbers
    set total = 0
    return numbers=numbers
  }

  step id="aggregate" desc="Sum aggregation" {
    each n in numbers {
      math add a=total b=n -> total
      if total > 6 {
        math add a=total b=0 -> partial
        return sum=partial
      }
    }
    return sum=total
  }

  step id="validate" desc="Validation / retry" onError="continue" {
    if total < 6 {
      print "Total too small, restarting"
      var [1,2,3,4] -> expanded
      set numbers = expanded
      set total = 0
      jump to="aggregate"
    }
  }

  step id="report" desc="Write report" {
    print "Total sum:" total
    return message="done"
  }

  step id="finalize" desc="Finalize" {
    print "Final total:" total
    math add a=total b=0 -> finalTotal
    return status="ok" value=finalTotal
  }

  return prepared=prepare aggregate=aggregate report=report finalize=finalize
}

step id="final" desc="Print results" {
  print "pipeline:" pipeline
  print "prepare:" pipeline.prepared
  print "aggregate:" pipeline.aggregate
  print "report:" pipeline.report
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
