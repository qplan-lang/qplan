# QPlan Step System — Consolidated Design (v2 Draft)

This is the formal specification capturing every design decision made so far on the **QPlan Step System**.  
Steps are the core construct for representing execution flow, structuring logic, and enabling jump/control features.

---

# 1. Purpose of introducing steps

Steps enable:

- Clearly structured execution units  
- Parent/child hierarchy  
- Stage-by-stage UI progress  
- AI-friendly step-based plans  
- Flow-control extensions (jump/break/loop, etc.)  

Description-only “pseudo steps” cannot handle flow control, so steps must be **promoted to a formal grammar element**.

---

# 2. Step grammar

## Basic form
```
step "Description" {
    <statements>
}
```

## Extended form
```
step id="read" desc="Read file" {
    file op="read" path="./a.txt" -> raw
}
```

## Further optional attributes
```
step id="calc" type="task" desc="Calculation phase" {
    math op="avg" arr=raw -> avg
}
```

---

# 3. StepNode structure (AST)

```
StepNode {
    id: string
    desc?: string
    type?: string                // optional (task, group, loop, etc.)
    errorPolicy?: ErrorPolicy    // fail | continue | retry | jump
    order: number                // auto-increment
    path: string[]               // hierarchical path (auto-generated)
    parent?: StepNode
    children: Statement[]
}
```

Auto-generated fields: `order`, `path`, `parent`, `children`

---

# 4. Sub-step structure

Steps may contain nested steps:

```
step "Full processing" {

    step "Read file" {
        file op="read" path="./a.txt" -> raw
    }

    step "Compute" {
        math op="avg" arr=raw -> avg
    }

}
```

Hierarchy example:

```
root
 └─ Full processing
      ├─ Read file
      └─ Compute
```

## 4.1 Sub-step best practices
- Keep high-level names in parent steps and place detailed logic in sub-steps.
- If a sub-step fails, its own onError policy triggers first; the parent may jump elsewhere as needed.
- Returned values from sub-steps remain accessible via ctx in parent steps.

Example:
```
step id="pipeline" desc="Root stage" {
    step id="prepare" desc="Data prep" {
        file read path="./input.txt" -> raw
        return data=raw
    }

    step id="aggregate" desc="Aggregate" onError="retry=2" {
        math add a=total b=unknown -> total   # triggers retry policy
        return sum=total
    }

    step id="report" desc="Report" {
        if aggregate.sum > 100 {
            jump to="review"
        }
        return summary="done"
    }

    step id="review" desc="Re-check" onError="jump=\"cleanup\"" {
        ...
    }

    step id="cleanup" desc="Finalize" {
        ...
    }

    return prepare=prepare aggregate=aggregate report=report
}
```

---

# 5. Jump syntax (flow control)

## Syntax
```
jump to="read"
```

A jump targets **step IDs only** (no per-action jumps).

## Behavior
- The executor looks up the StepNode by ID.  
- Execution resumes at the first statement inside that step block.

---

# 6. Step output

Treat a step like a function whose name doubles as the namespace:

```
step id="read" desc="Read file" {
    file op="read" path="./a.txt" -> raw
    return data=raw count=rawCount
}
```

Behavior:
- By default the runtime builds an object that exposes every action output defined inside the step, so
  `namespace.outputName` works even if you skip `return`. The last action result is also preserved internally.
- Use `return key=value ...` (or the shorthand `return key value`) to shape explicit outputs when needed.
- The executor stores the payload under `ctx[runId][namespace]`, where `namespace` defaults to the step ID (override with `step ... -> resultVar`). Later steps access values as `read.data`, `analysis.report`, or any custom namespace you defined. Even when you override the namespace, the engine mirrors the same object under the original step ID so both `resultVar.field` and `stepId.field` work.

---

# 7. Step error policy (mandatory)

```
step id="fetch" desc="Network request" onError="continue" {
    http url="https://..." -> out
}
```

Supported options:

| Option | Meaning |
|------|------|
| fail | Default; stop immediately on error. |
| continue | Ignore errors and move to the next step. |
| retry=3 | Retry up to 3 times. |
| jump="cleanup" | Jump to a specific step on error. |

## 7.1 Policy behavior examples
- **fail (default)**: abort immediately unless another policy is set.
- **continue**: log the error and continue; the output variable may remain unset.
- **retry=n**: re-run the entire step up to n times; throw the last error if all attempts fail.
- **jump="stepId"**: jump to the given step if it exists, starting from its first statement.

Example sequence:
```
step id="prepare" desc="Init" {
    ...
}

step id="fetch" desc="Collect data" onError="retry=2" {
    http url="..." -> raw
    math add a=raw b=unknown -> broken    # triggers retry
    return data=raw
}

step id="transform" desc="Extra processing" onError="jump=\"cleanup\"" {
    ...
}

step id="cleanup" desc="Finalize" {
    ...
}
```

---

# 8. Executor step events

Events for UI integrations:

```
onPlanStart(plan, context?)
onPlanEnd(plan, context?)
onStepStart(stepInfo, context?)
onStepEnd(stepInfo, result?, context?)
onStepError(stepInfo, error, context?)
onStepRetry(stepInfo, attempt, error, context?)
onStepJump(stepInfo, targetStepId, context?)

// Execution Control Events
onAbort(context?)
onPause(context?)
onResume(context?)
onTimeout(context?)
onStateChange(newState, oldState, context?)
```

### Example stepInfo:
```
{
    stepId: "calc",
    desc: "Compute average",
    order: 3,
    parentStepId: "root",
    path: ["Full processing", "Compute"],
}
```

---

# 9. Grammar (EBNF extension)

```
StepStmt      = "step" , StepMeta , [ OutputBinding ] , Block ;
StepMeta      = QuotedString
              | ("id=" , Identifier , [ "type=" , Identifier ] , "desc=" , QuotedString) ;

JumpStmt      = "jump" , "to=" , Identifier ;
OutputBinding = "->" , Identifier ;
```

Add StepStmt / JumpStmt to the existing Script → Statement grammar.

---

# 10. Automatic step path rules

Example:
```
step "Full processing" {
    step "Read file" { ... }
}
```

Result:
```
Full processing      → ["Full processing"]
Read file            → ["Full processing", "Read file"]
```

Use these paths for UI tree rendering, progress indicators, etc.

---

# 11. Why step architecture stays separate from the executor

Steps form the **flow-control layer**, while the executor is purely an **AST runner**; their roles are entirely different.

### Issues if step logic lives inside the executor:
- All flow control (jump/retry/loop) pollutes executor logic.  
- Extending parallel/if/while becomes unmanageable.  
- Impossible to maintain step trees cleanly.  
- Difficult to test.  
- Blocks future extension points.

### Therefore, the step system must be a **separate module**.

---

# 12. Recommended file structure

```
src/
 ├─ core/
 │    ├─ executor.ts            # Pure AST executor
 │    ├─ parser.ts
 │    └─ executionContext.ts
 ├─ step/
 │    ├─ stepTypes.ts           # StepNode types
 │    ├─ stepParser.ts          # Step grammar parsing
 │    ├─ stepResolver.ts        # ID/path/order generation
 │    ├─ stepController.ts      # Jump, retry, error policy handling
 │    └─ stepEvents.ts          # Event emitter (onStepStart, etc.)
 └─ modules/                    # Action Modules
```

### Role summary

| File | Role |
|------|------|
| stepParser.ts | Parse step syntax → build StepNodes |
| stepResolver.ts | Create ID tables, paths, orders |
| stepController.ts | Handle jump/retry/error policies |
| stepEvents.ts | Dispatch events back to the executor |
| executor.ts | Run the AST only (no step logic) |

This architecture remains the cleanest and most extensible.

---

# 13. Feature summary

| Feature | Description | Status |
|------|------|------|
| Step grammar | Structured execution units | ✔ |
| Sub-steps | Hierarchical tree support | ✔ |
| Step output | Return step results | Optional |
| Step type | task/group/loop tags | Optional |
| Step error policy | Failure handling | ✔ (required) |
| Jump | Step-to-step control | ✔ |
| Step events | UI/log integration | ✔ |
| Step path | Tree rendering/logging | ✔ |
| Separate step architecture | Maintainability/extensibility | ✔ |

---

# 14. Conclusion

This step system delivers  
**workflow-engine flexibility**,  
**AI-friendly generation**,  
**intuitive UI integration**,  
and upgrades QPlan from a “language” into a **full workflow execution engine**.

- Clear grammar structure  
- Step model built on AST trees  
- Modular jump/flow control  
- Simplified executor  
- Optimized UI/AI integration  

This document stands as the **QPlan Step System v2 — Final Specification**.
