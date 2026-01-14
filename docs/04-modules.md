# 04-modules.md

## 1. Module system overview
Every QPlan capability is extended via **ActionModules**. A module can be a function or an object shaped like `{ execute(inputs, ctx) { ... } }`, and it may include the metadata below.

| Field | Description |
| --- | --- |
| `id` | Module name used in QPlan scripts; must be unique. |
| `description` | Shown to AI/docs; summarize the module purpose. |
| `usage` | Example usage string; prompt builders embed it verbatim. |
| `inputs` | Array of supported input parameter names. |
| `execute(inputs, ctx)` | Async or sync; returned values are stored in ctx. |

For function-style modules, attach metadata via properties:
```ts
export const echoModule = Object.assign(
  (inputs) => inputs,
  {
    id: "echo",
    description: "Return inputs as-is",
    usage: `echo msg="hello" -> out`,
    inputs: ["msg"],
  }
);
```

## 2. Default modules (basicModules)
Eleven modules auto-register into the default registry via `src/modules/index.ts`:

| Module | Description |
| --- | --- |
| `var` | Stores literals (number/string/JSON) into ctx variables; no copying existing vars. |
| `print` | console.log-style output mixing strings/numbers/ctx vars/key-value pairs. |
| `echo` | Returns the input object for debugging. |
| `sleep` | Waits N ms and returns a message. |
| `file` | `op=read/write` to read/write files; writing objects serializes to JSON. |
| `math` | Provides `add/sub/mul/div/sum/avg`; arrays accepted as JSON or strings. |
| `future` | Creates async work as `{ __future: Promise }`. |
| `join` | `futures="a,b,c"` resolves registered futures via `Promise.all`. |
| `json` | parse/stringify/get/set/keys/values/entries utilities. |
| `time` | Returns the current time in multiple formats (defaults to `HH:mm:ss`). |
| `date` | Returns the current date/time in multiple formats (defaults to `YYYY-MM-DD`). |

`src/index.ts` auto-registers the default modules:
```ts
import { basicModules } from "./modules/index.js";
registry.registerAll(basicModules);
```

## 3. Additional modules (src/modules/basic)
Beyond the default bundle, the repo ships these modules. Activate them via `registry.register()` and prompt builders pick them up automatically.

| Module | Highlights |
| --- | --- |
| `http` | fetch-based GET/POST with JSON strings for `headers`/`body`. |
| `html` | Extract body/tag/tags/text from HTML strings (regex-driven). |
| `string` | lower/upper/trim/replace/split/join/includes/length/substring utilities. |
| `ai` | Calls OpenAI Chat Completions; supports `prompt/context/model/temperature/system`. |
| `timeout` | Waits ms then returns a value; zero/negative ms throw errors. |

Add custom modules in the same folder structure if needed.

## 4. Module registration pattern
```ts
import { registry } from "qplan";
import { httpModule } from "qplan/dist/modules/basic/http.js";

registry.register(httpModule);              // 단일 등록
registry.registerAll([htmlModule, aiModule]); // 여러 모듈 일괄 등록
```

- `registry.register(module)` checks ID collisions and throws if duplicated.
- Modules without IDs trigger warnings and are skipped (LLMs couldn’t use them safely).
- `registry.list()` returns metadata for all registered modules to feed into AI prompts.

## 5. ActionModule implementation guide
1. **ctx variable access** – If a string input matches a ctx variable name, the executor auto-injects the value. You can also call `ctx.has/ctx.get` directly.
2. **Async handling** – If `execute` returns a Promise, the executor awaits it. For future-style concurrency, return `{ __future: Promise }` so only the promise is saved.
3. **I/O validation** – Throw explicit errors when required params are missing so the step’s onError policy engages.
4. **Metadata** – Populate `description/usage/inputs` so `buildAIPlanPrompt` can communicate usage naturally to the AI.
5. **State** – Prefer stateless modules. When shared state is needed, inject it externally or leverage the ExecutionContext.
6. **Execution control** – Long-running loops or waits should call `await ctx.checkControl()` periodically so pause/abort requests take effect. Use `ctx.getExecutionState()` if you need to branch on current state.

## 6. Module debugging & testing
- **Examples** – Run `.qplan` scripts under `examples/` to verify module behavior.
- **validateQplanScript** – Use the grammar validator when introducing new modules to ensure baseline safety.
- **Step events** – If module logs aren’t enough, subscribe to step event hooks to trace execution spans.

## 7. Module best practices
- Keep IDs short and clear (e.g., `search`, `payment`).
- List every possible parameter name in `inputs` so AIs avoid invalid keys.
- Make `usage` snippets mirror real-world calls.
- Separate responsibilities: file I/O, math, strings, HTTP, etc.
- When reading ctx values internally, remember ExecutionContext supports dot paths.

Use this document as a quickstart to understand QPlan’s module system and build/register custom modules.
