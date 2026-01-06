# 07-registry.md

## 1. ModuleRegistry overview
The `ModuleRegistry` centrally manages every ActionModule QPlan can execute. Implemented in `src/core/moduleRegistry.ts`, it offers:

| Method | Description |
| --- | --- |
| `register(module)` | Register a single module. Without `module.id`, it warns and skips. |
| `registerAll(modules)` | Register modules sequentially; internally calls `register()`. |
| `get(id)` | Used by the executor to fetch modules; returns `undefined` if missing. |
| `list()` | Returns `{ id, description, usage, inputs }[]` metadata for AI/docs. |

Every `new ModuleRegistry()` auto-registers the default `basicModules`, so even custom instances start with the standard toolset. Pass `new ModuleRegistry({ seedBasicModules: false })` when you want a blank registry, or use `seedModules` to preload your own list.

## 2. Registration example
```ts
import { registry } from "qplan";
import { httpModule } from "qplan/dist/modules/basic/http.js";

registry.register(httpModule);
registry.registerAll([htmlModule, aiModule]);
```

- Each module can be registered only once; duplicate IDs raise errors.
- Modules without IDs print a warning (`AI cannot refer to this module`) and remain unregistered, so even temporary modules should have IDs.

## 3. Metadata & AI prompts
`registry.list()` returns the current module info. `buildAIPlanPrompt(requirement, { registry })`, `buildQplanSuperPrompt(customRegistry)`, or `listRegisteredModules(registry)` all consume this data directly. Module IDs may include any Unicode letter/digit plus underscores (e.g., `foo`, `foo_bar`, `분석작업`), but they must start with a letter or underscore; otherwise `registry.register()` throws an error.

```ts
const modules = registry.list();
/*
[
  { id: "file", description: "파일 읽기/쓰기", usage: "file read path=...", inputs: ["op","path","data"] },
  ...
]
*/
```

The better the metadata, the more accurately the AI produces QPlan commands. `description` and `usage` are injected verbatim into prompts.

## 4. How the registry participates in execution
1. `runQplan(script, { registry })` parses to AST, then the executor runs steps using the provided registry (defaults to the shared singleton).
2. For each action, the executor calls `registry.get(moduleId)`.
3. Missing modules throw immediately and are handled via the step’s onError policy.
4. Returned results populate the ExecutionContext; future actions referencing the same names receive those values automatically.

- **Add custom modules**: implement an ActionModule and call `registry.register(customModule)`.
- **Temp/sandbox modules**: still assign IDs so AI/docs can see them; otherwise registration is skipped.
- **Multiple registries**: instantiate `const custom = new ModuleRegistry()` (basic modules included automatically), register extra modules, and pass it to both `runQplan(script, { registry: custom })` and `buildAIPlanPrompt(requirement, { registry: custom })`. To start empty, use `new ModuleRegistry({ seedBasicModules: false })`.
- **Updating metadata**: modifying `description/usage/inputs` updates the `registry.list()` output immediately.

## 6. Module management best practices
- Use lowercase, concise IDs (`search`, `payment`).
- Include every real input key in `inputs` so the AI avoids typos.
- Provide real QPlan snippets in `usage` for better prompt hints.
- Log `console.log(registry.list())` to inspect the registry state.

With this guide you can see how ModuleRegistry underpins QPlan’s module ecosystem and how it powers both execution and LLM integrations—now with first-class support for swapping registries at runtime.
