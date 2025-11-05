# Refactoring Plan (30 days) - WhatsApp Shopping Chatbot

This document summarizes the full refactoring roadmap and practical steps to start work immediately.

Purpose

- Improve code quality, security, and test coverage.
- Ensure CI/CD (GitHub Actions) remains green (file size, lint, tests).
- Prepare a maintainable modular codebase with high test coverage.

High-level timeline (30 days)

- Week 1: Testing foundation (Jest install/config, 30 critical tests)
- Week 2: Expand tests & add InputSanitizer; reach ~75% coverage
- Week 3: Replace console.log with SecureLogger; split large handlers
- Week 4: Security hardening, pre-commit hooks, docs, release

Immediate next actions (Day 1)

1. Add jest configuration file `jest.config.cjs`.
2. Install dependencies (`npm install`).
3. Verify Jest is available (`npx jest --version`).
4. Start writing the first set of unit tests (CustomerHandler basics).

Quick checklist

- [ ] `jest.config.cjs` added
- [ ] `docs/REFACTOR_PLAN.md` added (this file)
- [ ] `src/utils/InputSanitizer.js` created and tested
- [ ] `lib/SecureLogger.js` implemented and integrated
- [ ] `scripts/check-file-sizes.js` implemented
- [ ] Husky pre-commit hooks configured
- [ ] All files in `src/` < 700 lines
- [ ] Global coverage >= 80%

Where to start in codebase

- Handlers: `src/handlers/` (CustomerHandler, AdminHandler, product handlers)
- Core router: `src/core/MessageRouter.js`
- Session manager: `sessionManager.js`
- Business logic entry: `chatbotLogic.js`
- Utilities: `lib/` and `src/utils/`

Contact & Notes

- Work incrementally; run `npm run check` before pushes.
- Use `.github/memory/` for notes and decisions.

---

Generated: Nov 5, 2025
