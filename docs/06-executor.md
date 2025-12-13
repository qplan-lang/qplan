# 06-executor.md

## 1. Executor overview
The executor (`src/core/executor.ts`) is the **engine that runs workflows step by step** using the parsed AST, ModuleRegistry, and ExecutionContext. Execution flows as follows:

1. Analyze the step tree via `resolveSteps(root.block)` and initialize the `StepController`.
2. Traverse each AST block top-to-bottom, handling Action/If/While/Each/Parallel/Set/Return/Jump/Step nodes.
3. Store action results in the ExecutionContext (ctx) while the StepController enforces onError policies and emits events.
4. When a jump or `onError="jump"` occurs, recalc the current block index and move to that target step.

```
Executor.run(ast, ctx)
  └─ resolveSteps(ast.block)
  └─ while (true)
        executeBlock(block)
            └─ executeNode(node)
                - Action / If / While / Each / Parallel / Step / Jump ...
```

## 2. Action execution rules
- Module lookup: use `registry.get(node.module)`; missing modules throw errors.
- Execution modes  
  1. Function modules: `await mod(args, ctx)`  
  2. Object modules: `await mod.execute(args, ctx)`
- Futures: if the result looks like `{ __future: Promise }`, only the promise is stored in ctx and returned immediately.
- Auto storage: by default `ctx.set(node.output, result)` saves outputs; modules like var/print may set `__suppressStore` via the parser to skip it.

## 3. Conditionals / loops / flow control
### If / While
- Comparators: `> < >= <= == != EXISTS NOT_EXISTS`
- Logic: `AND`, `OR`, `not`, plus parentheses for precedence
- Operands accept ctx variables or dot paths like `stats.total`.
- While reuses the same condition syntax, enabling `stop`/`skip` inside.

### Each
- Syntax: `each item in iterable { ... }` or `each (item, idx) in iterable { ... }`
- The iterable must exist in ctx and be array-like/iterable.
- `stop` exits the loop; `skip` continues to the next iteration.

### Parallel
- Syntax: `parallel { ... } concurrency=2 ignoreErrors=true`
- Options may appear before or after the block; `parallel: ... END` also works.
- Runs internal statements concurrently, applying `concurrency` to throttle.
- `ignoreErrors=true` suppresses some action errors to keep the block running.

### Jump / Set / Return
- `jump to="stepId"` only targets step IDs; StepController throws a JumpSignal to reset execution.
- `set target = expression` mutates existing ctx variables using `+ - * /` and parentheses.
- `return key=value ...` shapes the step output object; requires at least one key/value pair.

## 4. StepController & onError policies
When executing a step, the executor delegates to `StepController.runStep()` which enforces:

| Policy | Behavior |
| --- | --- |
| `fail` | Default. Throw immediately when errors occur. |
| `continue` | Record the error, treat the step as succeeded, and move on. |
| `retry=N` | Retry up to N times, emitting `onStepRetry` per attempt. |
| `jump="stepId"` | On error, raise a JumpSignal to that step. |

The controller also fires `onStepStart/End/Error/Retry/Jump` so UIs/logs can follow progress. Step outputs are stored under the header’s `-> output` name.

## 5. ExecutionContext interaction
- Store results via `ctx.set(name, value)`; later arguments that match ctx keys automatically resolve to those values.
- Dot paths such as `order.detail.status` are resolved by `ExecutionContext.resolvePath()`.
- `ctx.toJSON()` dumps the full state for debugging/logging.

## 6. Future + Join flow
1. When `future` returns `{ __future: Promise }`, the executor stores the promise under the output variable.
2. `join futures="f1,f2"` looks up those names in ctx, runs `Promise.all`, and returns the array.
3. Other steps/actions can reuse the array via dot paths.

## 7. Error handling & jump internals
- **JumpSignal**: triggered by `jump to="stepId"` or onError jumps to halt the current block.
- **Block override**: the executor uses the jump target’s `block/statementIndex/parent` to adjust where execution resumes.
- **Retry loop**: every retry cycle reruns the same step block per the StepController’s policy.

## 8. Example – how the executor drives steps
```qplan
step id="pipeline" desc="Full pipeline" -> result {
  step id="prepare" desc="Prepare" -> prepareResult {
    file read path="./data.txt" -> raw
    return raw=raw
  }

  step id="process" desc="Compute" onError="retry=2" -> processed {
    math op="div" a=raw b=0 -> impossible   # fails → retry
  }

  step id="cleanup" desc="Finalize" onError="continue" {
    print text="done"
  }

  return final=processed
}
```
- The executor runs steps sequentially, retries the `process` step on failure, and lets `cleanup` proceed thanks to `onError="continue"`.

Use this reference to understand how the executor, StepController, and ExecutionContext coordinate, aiding custom module development or step-event hook design.
