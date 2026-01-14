# 02-grammar.md  
**QPlan Language Grammar — Full Specification (includes EBNF)**

This document defines the **official grammar** of QPlan Language.  
It contains both Version A (core grammar) and Version B (full EBNF), so **this file alone lets you fully understand QPlan**.

---

# 1. QPlan Language overview

QPlan Language is a step-based workflow language where **every action runs inside a step block**.  
Scripts flow through Tokenizer → Parser → AST → Executor, and values stored in the ExecutionContext (ctx) can be reused via dot paths like `stats.total`.

Minimal example:
```
step id="demo" desc="Simple sum" {
  var [1,2,3] -> items
  math op="sum" arr=items -> total
  return total=total
}
```

---

# 2. Core grammar (Version A)

## 2.1 Script structure & steps
- A root script may list **step statements only**. Actions/If/Set outside a step cause a parser error.
- Optionally, wrap the script in a `plan { ... }` block to attach metadata that humans/tools can read.
  ```
  plan {
    @title "Onboarding Plan"
    @summary "Create accounts and schedule training"
    @version "0.1"
    @since "2025-01-01"

    step id="setup" {
      ...
    }
  }
  ```
  - Supported meta keys: `title`, `summary`, `version`, `since`.
  - Plan meta must appear at the top of the plan block (before any steps).
- Step form:
  ```
  step ["desc"] id="stepId" [desc="Description"] [type="task"] [onError="retry=3"] {
    ... (Action / If / While / Each / Parallel / Set / Return / Jump / Step ...)
  }
  ```
- The `desc` string can appear immediately after the `step` keyword or as an attribute.
- Allowed metadata:
  - `id`: identifier referenced by jumps and step events.
  - `desc`: human-readable description; if omitted, raw text after `step` may be used.
  - `type`: arbitrary tag (task/group/loop, etc.).
  - `onError`: `fail` (default) / `continue` / `retry=<N>` / `jump="<stepId>"`.
- Step IDs must contain Unicode letters or ASCII underscores, start with a letter/underscore, and may include digits after the first character.
- Comments are supported anywhere: use `// comment` or `# note` for single-line comments and `/* block */` for multi-line comments. The parser ignores them entirely.
- Step results are automatically stored under `ctx[runId][namespace]`, where `namespace` defaults to the step ID (override with `-> resultVar`). Other steps reuse them via `namespace.field`, and the engine also mirrors the same object under the original step ID so both names stay valid.
- Steps can contain nested steps to form a sub-step tree.
- Identifiers (module names, action outputs, variables, return keys, `set` targets, etc.) may include any Unicode letter/digit plus `_`, but they must start with a letter or underscore.

## 2.2 Return statement
- Written inside a step block as `return key=expression ...`.
- `=` is optional: `return gear accounts total=sum` (or `return gear, accounts, total=sum`) expands to
  `return gear=gear accounts=accounts total=sum`. Mixed forms are allowed.
- Entries may be separated by spaces or commas.
- Requires at least one value; multiple entries are combined into an object result.
- If omitted, the runtime still produces an object exposing every action output in the step, so
  later steps can reference `namespace.outputName`. The final action result is also stored internally.
- Whatever value is produced becomes the payload stored at `ctx[runId][namespace]` (namespace = step ID unless overridden via `-> resultVar`). When overridden, the same payload is also placed under the step ID for convenience.

```
return total=total average=avg
return gear, accounts, total=sum   # shorthand
```

## 2.3 Action syntax
```
<module> [<option> { AND <option> }] <args> [-> <var>]
```
- All actions must be inside steps.
- Options are identifiers after the module name; chain multiples with uppercase `AND`. The first option automatically maps to the `op` input.
- Without `-> var`, results are not stored in ctx.

Example:
```
math add a=1 b=2 -> sum
file read path="./data.txt" -> txt
sleep ms=500                 # no output capture
http get AND cache url="..." -> raw
```

## 2.4 Arguments (key=value)
Supported types:
- Numbers
- Strings `"text"`
- JSON `[1,2,3]`, `{ "x":1 }`
- ctx value references (if a string matches a ctx variable or a dot path like `stats.total`, it resolves automatically)

Example:
```
math op="avg" arr="[1,2,3]"
ai prompt="Summary" context=html
```

## 2.5 If statements
```
if <left> <op> <right> [and/or <left> <op> <right> ...] {
    ...
} else {
    ...
}
```
Supported comparison operators: `> < >= <= == != EXISTS NOT_EXISTS`.  
Combine conditions with `and`, `or`, `not`, and use parentheses `()` for precedence.  
Operands may reference ctx variables or dot paths like `stats.average`.

## 2.6 Parallel execution
```
parallel {
    ...
    ...
} concurrency=3 ignoreErrors=true
```
Options:
- `concurrency`: number of simultaneous executions.
- `ignoreErrors`: if true, suppress errors.
- `concurrency` / `ignoreErrors` can appear right after the `parallel` keyword or after the block. `parallel: ... END` syntax is also allowed.

## 2.7 Future / Join
Create a future:
```
future delay=500 value="done" -> f1
```
Join:
```
join futures="f1,f2,f3" -> result
```

## 2.8 Each loops
```
each item in list {
  ...
}
```
`list` must be an array/iterable in ctx. Use `each (value, idx) in list` to access value and index together.
Inside the loop (and similarly in `while`) use `break` / `continue` to control flow.

## 2.9 While loops
```
while count < 10 {
  ...
}
```
Shares the same condition syntax as `if`, repeating while the condition is true.  
`break` / `continue` are available to control the loop body.

## 2.10 Set statements
```
set count = count + 1
set message = "hello"
set config = {"limit":10}
```
Only existing ctx variables can be mutated (missing variables cause errors).  
Expressions may combine numbers, strings, JSON literals, existing variables, parentheses, and arithmetic operators (+,-,*,/).

## 2.11 Control Flow

### Loop Control
- `break`: immediately terminate the current each/while loop.
- `continue`: skip the current iteration and continue with the next one.

### Plan/Step Control
- `stop`: terminate the entire plan execution (all steps immediately stop).
- `skip`: skip the rest of the current step (move to the next step).

### Step Navigation
- `jump to="stepId"`: instantly move to another step at the same/parent/child level. Targets must be step IDs, given as strings or identifiers.

---

# 3. Full EBNF grammar (Version B)

```
Script          = PlanBlock | { StepStmt } ;

PlanBlock       = "plan" , "{" , { PlanMeta } , { StepStmt } , "}" ;
PlanMeta        = "@" , PlanMetaKey , PlanMetaValue ;
PlanMetaKey     = "title" | "summary" | "version" | "since" ;
PlanMetaValue   = QuotedString | Number ;

StepStmt        = "step" , StepHead , [ "->" , Identifier ] , Block ;
StepHead        = [ QuotedString ] , { StepAttr } ;
StepAttr        = Identifier , "=" , StepAttrValue ;
StepAttrValue   = QuotedString | Identifier | Number ;

Block           = "{" , { Statement } , "}" ;

Statement       = Action
                | IfStmt
                | WhileStmt
                | ParallelStmt
                | EachStmt
                | BreakStmt
                | ContinueStmt
                | StopStmt
                | SkipStmt
                | SetStmt
                | StepStmt
                | JumpStmt
                | ReturnStmt ;

Action          = ModuleName , [ OptionSeq ] , { Argument } , [ "->" , Identifier ] ;
OptionSeq       = Option , { "AND" , Option } ;
Option          = Identifier ;

ModuleName      = Identifier ;

Argument        = Identifier , "=" , Value ;

Value           = Number
                | QuotedString
                | JsonObject
                | JsonArray
                | IdentifierPath ;

ReturnStmt      = "return" , ReturnEntry , { ReturnEntry } ;
ReturnEntry     = Identifier , "=" , Expression ;

IfStmt          = "if" , Condition , Block , [ ElseBlock ] ;
ElseBlock       = "else" , Block ;

WhileStmt       = "while" , Condition , Block ;

EachStmt        = "each" ,
                  ( "(" , Identifier , [ "," , Identifier ] , ")" | Identifier ) ,
                  "in" , Identifier , Block ;

ParallelStmt    = "parallel" , [ ParallelOptions ] , Block , [ ParallelOptions ] ;
ParallelOptions = { ParallelOption } ;
ParallelOption  = "concurrency" , "=" , Number
                | "ignoreErrors" , "=" , Boolean ;

JumpStmt        = "jump" , "to" , "=" , (QuotedString | Identifier) ;
BreakStmt       = "break" ;
ContinueStmt    = "continue" ;
StopStmt        = "stop" ;
SkipStmt        = "skip" ;
SetStmt         = "set" , Identifier , "=" , Expression ;

Condition       = SimpleCondition , { LogicOp , SimpleCondition } ;
SimpleCondition = [ "NOT" ] , IdentifierPath , Comparator ,
                  (Number | QuotedString | IdentifierPath) ;
LogicOp         = "AND" | "OR" ;

Comparator      = ">" | "<" | ">=" | "<=" | "==" | "!=" | "EXISTS" | "NOT_EXISTS" ;

Expression      = Term , { ("+" | "-") , Term } ;
Term            = Factor , { ("*" | "/") , Factor } ;
Factor          = Number
                | QuotedString
                | IdentifierPath
                | JsonObject
                | JsonArray
                | "(" , Expression , ")"
                | "-" , Factor ;

Identifier      = Letter , { Letter | Digit | "_" | "-" } ;
IdentifierPath  = Identifier , { "." , Identifier } ;
QuotedString    = """ , { ANY_CHAR_BUT_QUOTE } , """ ;
Number          = Digit , { Digit } ;
Boolean         = "true" | "false" ;

JsonObject      = "{" , [ JsonPair , { "," , JsonPair } ] , "}" ;
JsonPair        = QuotedString , ":" , JsonValue ;
JsonValue       = QuotedString | Number | JsonObject | JsonArray ;

JsonArray       = "[" , [ JsonValue , { "," , JsonValue } ] , "]" ;
```

---

# 4. Execution rules

## 4.1 Steps & actions
1) Save step header info (id/desc/type/onError/output) and execute the block.  
2) For each action, look up the module in the ModuleRegistry and call `execute(inputs, ctx)`.  
3) When `-> out` exists, store the result via `ctx.set(out, result)`. The step result is either the last action result or the `return` object.

## 4.2 ctx variable resolution
- If an argument value is a string matching an existing ctx variable, it resolves to that value.
- Dot paths such as `stats.total` or `user.profile.name` are allowed and traverse nested ctx objects.
- JSON strings are not auto-parsed; modules handle conversion themselves.

## 4.3 Future / Join behavior
- The `future` module must return `{ __future: Promise }`.
- The executor stores the promise in ctx; `join` pulls the promises from ctx and runs `Promise.all`.

## 4.4 Parallel behavior
- Statements inside run concurrently.
- `concurrency` limits the number of simultaneous tasks.
- With `ignoreErrors=true`, some action errors are ignored so execution continues.

## 4.5 Jump & error policy
- `jump to="stepId"` locates the target step and resets execution to that block.
- A step’s `onError` policy (fail/continue/retry/jump) governs error flow, and retries trigger `onStepRetry` events.

---

# 5. Example (grammar in practice)

```
step id="load" desc="Read file" {
  file read path="./nums.txt" -> raw
  json parse data=raw -> parsed
  return list=parsed
}

step id="stats" desc="Compute average" {
  math op="avg" arr=load.list -> avg
  if avg > 50 {
    echo msg="high" -> note
  } else {
    echo msg="low" -> note
  }
  return average=avg note=note
}

step id="sleepers" desc="Parallel tasks" {
  parallel concurrency=2 ignoreErrors=true {
    sleep ms=300 -> slow
    sleep ms=100 -> fast
  }
}
```

---

# 6. Grammar summary

- Step-enforced structure: every action/control statement lives inside a step.  
- Steps control flow via onError (fail/continue/retry/jump) and `jump`.  
- Action = module name + optional options + key=value arguments + optional output capture.  
- Arguments support numbers/strings/JSON/dot-path variable references.  
- Built-in Future/Join/Parallel/Each/While/Set/Return/Jump constructs.  
- If conditions compare numbers/strings, support EXISTS/NOT_EXISTS, and allow parentheses.  

---

**With this document you can fully parse and execute QPlan Language.**
