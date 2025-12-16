# Changelog

This document tracks QPlan releases.  
Each version highlights new features, improvements, and bug fixes.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- Initial doc set: README, grammar.md, modules.md, architecture.md, examples.md  
- CONTRIBUTING.md  
- CHANGELOG.md  
- Base QPlan language grammar  
- EBNF-driven language spec  
- Concept for core modules (FETCH, CALC, AI, CALL)  
- Execution engine architecture (Tokenizer → Parser → AST → Executor)

### Changed
- Documentation structure cleanup (migrating into `docs/`)

### Fixed
- None

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
