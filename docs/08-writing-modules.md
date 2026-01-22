# 08-writing-modules.md

QPlan’s capabilities expand via ActionModules. This guide covers function/object module patterns, metadata rules, ctx/asynchronous handling, and debugging tips.

## 1. ActionModule styles
| Style | Description | Examples |
| --- | --- | --- |
| Function | Export a function and attach metadata via `Object.assign()`. | `echoModule`, `sleepModule`, `mathModule` |
| Object | Provide `{ execute(inputs, ctx) { ... } }`. | `fileModule`, `httpModule`, `aiModule` |

```ts
// Function example
export const echoModule = Object.assign(
  (inputs: Record<string, any>) => inputs,
  {
    id: "echo",
    description: "Return input as-is",
    usage: `echo msg="hello" -> out`,
    inputs: ["msg"],
  }
);

// Object example
export const fileModule = {
  id: "file",
  description: "Read/write files",
  usage: `file read path="./a.txt" -> txt`,
  inputs: ["op", "path", "data"],
  async execute(inputs, ctx) {
    ...
  }
};
```

## 2. Metadata rules
- `id` (required): name used in QPlan commands; must be unique.
- `description`: concise explanation shown verbatim in prompts.
- `usage`: actual QPlan snippet (multi-line allowed).
- `inputs`: list of supported parameter names to guide the AI.
- `inputType`: input schema in JSON form. Example: `{ name: "string", options: { limit: "number" } }`.
- `outputType`: output schema in JSON form. Example: `{ title: "string", items: [{ id: "string" }] }`.

Both styles share the same metadata schema, surfaced via `registry.list()`.

```ts
export const profileModule = {
  id: "profile",
  description: "Build a profile object",
  usage: `profile name="kim" age=20 -> out`,
  inputs: ["name", "age"],
  inputType: { name: "string", age: "number" },
  outputType: {
    title_a: "string",
    gndType: "number",
    arr: [{ obj1: "any", obj2: "any" }],
  },
  execute(inputs) {
    return { title_a: inputs.name, gndType: inputs.age, arr: [] };
  },
};
```

## 3. Handling inputs & ctx
- If a string argument matches a ctx variable, the executor auto-injects its value. Modules can also call `ctx.has/ctx.get`.
- When you need raw JSON, parse it inside the module (see `json`, `http`).
- Throw explicit errors (`throw new Error(...)`) when params are missing/invalid so the step’s onError policy kicks in.

## 4. Async work & futures
- Plain async functions can return Promises; the executor awaits them.
- To leverage Future/Join, return `{ __future: Promise }`. Example: the `future` module wraps a `setTimeout` promise and stores it in ctx.

```ts
export const futureModule = {
  id: "future",
  execute(inputs) {
    const p = new Promise(res =>
      setTimeout(() => res(inputs.value), inputs.delay)
    );
    return { __future: p };
  }
};
```

## 5. Files & external dependencies
- When using Node APIs (fs, path, etc.), keep everything under async/await.
- Be mindful of sandbox/permission policies for network calls (e.g., `httpModule` uses fetch).

## 6. Registering & testing
1. After writing the module, register via `registry.register(customModule)` or `registry.registerAll([...])`.
2. Build quick steps similar to `docs/05-examples.md` to verify behavior.
3. Run `npm run validate -- -` or call `runQplan` directly for tests.
4. Confirm metadata includes id/description/usage/inputs so AI prompts pick it up.

## 7. Best practices
- Keep modules stateless; inject external services/classes when needed.
- Provide clear error messages for humans and AI alike.
- Use `console.log`/`console.error` judiciously—avoid noisy output.
- Reuse helper functions or other modules to prevent duplication.

Follow this guide to write consistent QPlan modules and integrate them cleanly into the registry/AI workflow.
