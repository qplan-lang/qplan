# 05-examples.md

This document collects representative QPlan examples with a step-first mindset. Each one runs directly with `runQplan`, using modules from `basicModules` or `src/modules/basic`.

## 1. Hello QPlan – simplest step
```qplan
step id="hello" desc="First output" {
  echo msg="hello" -> out
  print text=out
}
```
- All actions must be inside steps.
- `echo` stores its result in `out`, and `print` reads it directly from ctx.

## 2. Read a file + compute averages
```qplan
step id="load" desc="Read file" -> dataset {
  file read path="./nums.txt" -> raw
  json parse data=raw -> parsed
  return list=parsed
}

step id="avg" desc="Average" -> stats {
  math op="avg" arr=dataset.list -> avg
  math op="sum" arr=dataset.list -> total
  return average=avg total=total
}

step id="report" desc="Print" {
  print label="total" value=stats.total
  print label="avg" value=stats.average
}
```
- Reads a JSON array from disk, parses it, and calculates average and sum.
- References the `load` step output via `dataset.list` using dot paths.

## 3. Async flow with Future + Join
```qplan
step id="async" desc="Create futures" -> futures {
  future task="A" delay=300 value="doneA" -> f1
  future task="B" delay=500 value="doneB" -> f2
  return list=[f1,f2]
}

step id="join" desc="Join futures" -> results {
  join futures="f1,f2" -> values
  return values=values
}
```
- The `future` module stores `{ __future: Promise }` objects in ctx, enabling `join` to run `Promise.all` by name.

## 4. Parallel block with error suppression
```qplan
step id="parallelWork" desc="Parallel run" {
  parallel concurrency=2 ignoreErrors=true {
    echo msg="A" -> a
    sleep ms=100 -> s1
    sleep ms=50 -> s2
    jump to="skip"   # step control still works inside parallel when the target exists
  }
}

step id="skip" desc="Next step" {
  print text="parallel finished"
}
```
- You can place `concurrency` and `ignoreErrors` before or after the block.
- Jumps always target step IDs.

## 5. Each loop with stop/skip
```qplan
step id="loop" desc="Loop example" -> summary {
  var 0 -> total
  json parse data="[1,2,3,4]" -> nums
  each (n, idx) in nums {
    if n == 3 {
      stop
    }
    if idx == 0 {
      skip
    }
    math add a=total b=n -> total
  }
  return count=nums.length total=total
}
```
- Inside `each`, `stop` exits the loop and `skip` jumps to the next iteration.
- Dot-path access such as `nums.length` is resolved by the ExecutionContext.

## 6. Counter updates with While + Set
```qplan
step id="counter" desc="While loop" -> result {
  var 0 -> count
  while count < 5 {
    set count = count + 1
  }
  return final=count
}
```
- `set` only mutates existing ctx variables, keeping loop arithmetic simple.

## 7. Step onError policies + jump
```qplan
step id="prepare" desc="Initialize" {
  var 0 -> retryCount
}

step id="mayFail" desc="Failure example" onError="retry=2" -> payload {
  math op="div" a=1 b=retryCount -> fail   # first run divides by zero → error → retry
  return value=fail
}

step id="cleanup" desc="Handle error" onError="continue" {
  jump to="summary"
}

step id="summary" desc="Wrap up" {
  print final=payload.value
}
```
- `onError="retry=2"` retries the entire step twice before surfacing the final error.
- `cleanup` finishes safely with onError="continue" and jumps to `summary`.

## 8. AI-driven usage with module metadata
```ts
import { buildAIPlanPrompt, registry, setUserLanguage } from "qplan";
import { httpModule } from "qplan/dist/modules/basic/http.js";

registry.register(httpModule);
setUserLanguage("en"); // supply any language string (e.g., "fr")
const prompt = buildAIPlanPrompt("Fetch open API data and summarize it");
const script = await callLLM(prompt);
await runQplan(script);
```
- Registering modules automatically teaches the AI how to call them via the prompt builder.

## 9. Validate before running
```bash
npm run validate -- examples/12_exam_step.qplan
```
- Early validation of grammar, step structure, and jump targets prevents runtime surprises.

Use these examples as a baseline, then add your own ActionModules or customize step structures to capture diverse automation scenarios in QPlan.
