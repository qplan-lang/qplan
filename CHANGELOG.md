# Changelog

This document tracks QPlan releases.  
Each version highlights new features, improvements, and bug fixes.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.5.0] - 2026-01-12

### Added
- **New Control Flow Keywords**
  - `break`: Exit from `each` or `while` loops (replaces old `stop` for loops)
  - `continue`: Skip to next iteration in loops (replaces old `skip` for loops)
  - `stop`: Terminate entire plan execution (NEW - stops all steps immediately)
  - `skip`: Skip rest of current step and move to next step (NEW - step-level control)

- **Execution Control System**
  - `ExecutionController`: New class for managing plan execution lifecycle
  - `abort()`: Force stop execution
  - `pause()` / `resume()`: Pause and resume execution
  - `timeout`: Set execution time limits
  - `checkpoint`: Save and restore execution state
  - State monitoring: Track execution state (idle/running/paused/completed/aborted/error)

- **New Signal Types**
  - `PlanStopSignal`: Signal for plan-wide termination
  - `StepSkipSignal`: Signal for skipping current step
  - `AbortError`: Error thrown when execution is aborted

### Changed
- **BREAKING**: Loop control keywords renamed for clarity
  - `stop` → `break` (for loop exit)
  - `skip` → `continue` (for next iteration)
  - Old `stop`/`skip` in loops will cause parse errors
  
- **Enhanced**: `stop` and `skip` now have new meanings
  - `stop`: Plan-level control (stops entire execution)
  - `skip`: Step-level control (skips to next step)

### Updated
- All documentation updated to reflect new keywords
  - `docs/02-grammar.md` (English)
  - `docs/ko/02-grammar.md` (Korean)
  - `docs/01-overview.md` (English)
  - `docs/ko/01-overview.md` (Korean)
  - `docs/12-execution-control.md` (NEW)
  
- Examples updated with new keywords
  - `examples/07_exam_for.js`: Updated to use `break`/`continue`
  - `examples/11_exam_while.js`: Updated to use `break`/`continue`
  - `examples/23_exam_control_flow.js`: NEW - demonstrates all control flow keywords
  - `examples/22_exam_execution_control.js`: NEW - demonstrates execution control features

### Migration Guide
**For existing QPlan scripts:**

Replace `stop` with `break` in loops, `skip` with `continue` in loops.
Use new `stop` for plan termination, new `skip` for step control.

---

## [0.4.1] - 2026-01-07

### Added
- Add Homepage link (`https://qplan.org`).

---

## [0.4.0] - 2026-01-07

### Added
- `plan { ... }` wrapper syntax with `@title`, `@summary`, `@version`, and `@since` metadata for human-readable QPlan scripts.
- Plan metadata exposure via AST (`planMeta`) and plan start events.
- `QPlan.getPlanMeta()` plus examples and tests covering plan metadata.

### Changed
- AI-friendly grammar summary and docs updated to describe the `plan` block.

---

## [0.3.0] - 2026-01-06

### Added
- `QPlan` wrapper class (`src/qplan.ts`) and walkthrough example (`examples/19_exam_qplan_object.js`) so scripts can be pre-validated, step lists rendered, and lifecycle tracked outside of `runQplan`.
- Comment syntax support (`//`, `#`, `/* ... */`) plus README/overview/architecture/quickstart/AI-integration updates explaining how to use it.
- Comment-focused sample (`examples/20_exam_comments.js`) and accompanying parser/runtime tests (`tests/parser/comments.qplan`, new runtime test).

### Changed
- Split out reusable validator logic (`src/core/qplanValidation.ts`) so `validateQplanScript` and `QPlan.validate()` share the same implementation.
- Documented the QPlan object + comment support across both EN/KR docs.

### Fixed
- N/A (feature-focused release).

---

## [0.2.1] - 2025-12-16
- Fixed step outputs being passed as literal identifier strings by resolving action arguments from the execution context before module execution.

---

## [0.2.0] - 2025-12-15
- Step `return` shorthand (`return gear, accounts, total=sum`) now expands per the grammar specification, guaranteeing results live under both the step ID and any alias namespace.
- Step outputs are always mirrored under both `stepId` and `stepId.outputVar`, so later steps can reference either form without extra wiring.

---

## [0.1.6] - 2025-12-15

### Added
- `runQplan` now accepts `registry`, `env`, `metadata`, and richer `stepEvents` (plan start/end plus context-aware step payloads).
- `ExecutionContext` exposes `getEnv()` / `getMetadata()` so modules can inspect user/session data.
- `buildAIPlanPrompt(requirement, { registry, language })` and `listRegisteredModules()` APIs for prompt builders/UI integrations.
- Browser-safe `file.browser.ts` stub (wired via `package.json` `"browser"` map) to keep web bundles free of Node I/O deps.
- Runtime tests for env/metadata propagation and `validateQplanScript` coverage.

### Changed
- `ModuleRegistry` instances now auto-register `basicModules` (opt-out via `{ seedBasicModules: false }`), and docs/README were updated accordingly.
- `examples/16_exam_ai_plan.js` feeds validation/execution errors back to the LLM so retries learn from failures.
- README/Quickstart docs now highlight using the global registry first, with custom registry guidance afterward.

### Fixed
- Bundlers no longer warn about `fs/promises`/`path` when importing `qplan` in browser builds.

---

## [0.1.5] - 2025-12-14

### Added
- Comprehensive documentation pass covering overview, grammar, architecture, modules, executor, registry, AI integration, and quickstart.

### Changed
- Clarified contributing guide, module guide, and examples for the MVP scope.

---

## [0.1.4]

### Added
- MVP draft completed: tokenizer/parser/AST wiring, executor prototype, and registry bootstrap.
- Initial CLI validator plus parser test harness.

### Notes
- Internal milestone proving the end-to-end “AI thinks, QPlan executes” loop.

---

## [0.1.0] - Initial Draft

### Added
- Tokenizer draft  
- Parser draft  
- AST node definitions  
- ExecutionContext / ModuleRegistry skeleton  
- Sample modules (FETCH, CALC, AI)  
- First execution script tests

### Notes
- Early MVP, experimental state  
- Parallel execution beta planned

---

# Versioning
This project follows Semantic Versioning (semver.org).

---

# License
MIT License (planned)
