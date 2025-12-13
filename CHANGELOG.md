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
