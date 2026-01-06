# Why use QPlan?

QPlan is a language-neutral, safety-first AI planning language that lets an AI **build an execution plan on the fly and run it immediately**.  
The goal is not "code generation," but **real-time planning and execution**.

---

# 1. It solves common problems when AI builds real-time execution plans

When AI tries to assemble execution logic in a general-purpose language, it tends to:

- Vary logic structure on every run  
- Make mistakes in async/conditional/parallel flow  
- Over-infer and over-complicate plans  
- Depend heavily on the runtime environment  
- Increase side-effect risks  
- Lose reproducibility  
- Separate plan and execution, making consistency harder  

In short, **letting AI build execution flow directly in arbitrary code is unstable**, regardless of the language.

QPlan fixes this by locking down:

- Grammar  
- Execution rules  
- Variable context  
- Module usage  

AI builds the plan, and the engine executes it.  
(AI steps can still be included where needed.)

---

# 2. Module extensibility - expand capabilities without limits

Every QPlan capability is a module (ActionModule).

Examples:
- DB queries  
- API calls  
- Text/document processing  
- File systems  
- Slack/Email messaging  
- AI calls  
- DevOps tasks  
- Internal company actions  

Modules carry metadata (id, inputs, usage), so the AI uses them in a documented way.

> Developers build capabilities. AI assembles execution plans.

---

# 3. AI writes the plan, the engine executes safely

QPlan has a clear division of responsibilities:

- **AI's role**: decide which modules to run and in what order  
- **Engine's role**: execute the AST safely and consistently  

Any language can implement the modules.

Example plan:

```
file read path="./data.json" -> raw
json op="parse" data=raw -> parsed
http op="post" url="/save" body=parsed -> result
```

The engine runs it exactly as written.

---

# 4. Async (Future) and parallel control are built into the language

Async flow in general-purpose code is hard for AI to infer.  
QPlan makes it explicit:

```
future delay=500 value="A" -> f1
future delay=500 value="B" -> f2
join futures="f1,f2" -> out
```

Or parallel:

```
parallel concurrency=3 {
    api call op="stats" -> s
    api call op="user" -> u
    api call op="orders" -> o
}
```

This removes one of the hardest planning problems for AI.

---

# 5. ExecutionContext - automatic variable and state management

General-purpose code always runs into variable scope and state management issues.

In QPlan:

```
math op="add" a=1 b=2 -> sum
echo msg=sum
```

ExecutionContext stores and resolves values automatically.  
Step results and JSON objects can be accessed by dot paths like `sum.detail.total`.

---

# 6. Deterministic execution is essential for automation

AI-written code tends to:

- Change structure every run  
- Drift in flow  
- Include unintended logic  

QPlan fixes this with:

- Fixed grammar  
- Fixed modules  
- Fixed execution rules  

Same request -> same plan -> same result.

---

# 7. Language-neutral and AI-friendly

QPlan is not replacing a language.  
It is the planning layer before implementation.

- Clear grammar  
- Module metadata  
- Usage examples  
- Strict plan shape  

Consistent workflows across any runtime or model.

---

# Conclusion: why QPlan

1) AI generates **execution plans**, not code  
2) Solves common planning failures independent of language  
3) Unlimited extensibility through modules  
4) Built-in async/parallel/condition flow control  
5) ExecutionContext automates state management  
6) Deterministic execution guarantees stability  
7) Language-neutral and AI-friendly by design  

QPlan is the foundation for **AI-authored plans that execute safely and predictably**.
