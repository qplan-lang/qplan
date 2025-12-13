# Contributing to QPlan

Thank you for contributing to QPlan!  
This guide explains how to help across code, docs, tests, and ideas.

---

# 1. How to Contribute

QPlan is still early, so we especially welcome:

- Bug reports  
- Language/grammar proposals  
- Parser / lexer / AST improvements  
- Execution engine enhancements  
- New ActionModules  
- Documentation updates  
- Additional examples  

---

# 2. Issues

Report bugs or feature requests via **GitHub Issues**.

Include when possible:

- Summary  
- Steps to reproduce  
- Expected behavior  
- Actual behavior  
- Relevant scripts or code snippets  
- Environment info (Node.js version, OS, etc.)  

---

# 3. Pull Requests

Submit PRs using this flow:

1. Fork the repo.  
2. Create a new branch.  
   ```
   git checkout -b feature/my-change
   ```
3. Commit your changes.  
4. Open a PR describing the motivation and details.  

### PR 기준

- No build errors.  
- Update docs whenever grammar/engine behavior changes.  
- Keep PRs focused and small when possible.  

---

# 4. Code Style

- TypeScript 5+ (ESM)  
- Prefer explicit types when exported APIs change  
- Module IDs should stay lowercase, concise, and runtime-friendly  
- Follow the existing style in `src/`; run `npm run build` before submitting  

---

# 5. Tests

Please add tests for each change whenever possible.

- Default command: `npm test` (build + core parser tests).  
- Add TypeScript/JavaScript tests under `tests/`, or integration tests using `.qplan` scripts as needed.  
- For engine/grammar changes, reproduce failing cases first and keep regression coverage in place.  

---

# 6. Documentation

Documentation updates are valuable contributions.

Relevant files include:

- README.md / README.ko.md  
- docs/01-overview.md  
- docs/02-grammar.md  
- docs/03-architecture.md  
- docs/04-modules.md  
- docs/05-examples.md  
- docs/06-executor.md  
- docs/07-registry.md  
- docs/08-writing-modules.md  
- docs/09-ai-integration.md  
- docs/10-step-system.md  
- docs/11-qplan_quickstart_guide.md  

---

# 7. Branch Strategy

- `main`: latest stable  
- `dev`: integration branch  
- Feature work happens in `feature/*` branches  

---

# 8. Development Setup

### Requirements

- Node.js 18+  
- npm (pnpm/yarn also work; docs assume npm)  
- Editor with TypeScript support (VS Code, WebStorm, etc.)

### Install & Build

```
npm install
npm run build
```

### Useful scripts

- `npm run dev` — TypeScript watch build  
- `npm test` — build + parser tests  
- `npm run validate -- <file>` — CLI validator  

---

# 9. Module Contribution Guide

When adding modules:

1. Implement an `ActionModule` and fill in `id/description/usage/inputs`.  
2. Define required inputs and exceptions clearly.  
3. Register via `registry.register()` or `registry.registerAll()`.  
4. Add examples in `docs/05-examples.md` or related scripts.  
5. Update docs such as `docs/04-modules.md`, `docs/08-writing-modules.md`, etc.  
6. Add module-specific tests when possible to avoid regressions.  

---

# 10. Code of Conduct

All contributors must:

- Communicate respectfully  
- Value others’ work  
- Avoid harassment, insults, or discrimination  
- Focus on improving QPlan together  

---

# 11. License

All contributions fall under the QPlan MIT License.

---

# 12. Questions?

Feel free to open an Issue or Discussion for any questions.

Thanks!  
The QPlan Team
