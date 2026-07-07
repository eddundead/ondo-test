---
name: validate
description: Use after implementing or changing code in the portfolio-explorer codebase, before considering a task done. Runs every relevant check — unit tests, integration tests, lint, type checking, formatting — fixes any failures, and repeats until all checks pass green.
---

# Validate a change

Run all relevant checks, fix what fails, and loop until everything passes. Pairs with
[`implement-task`](../implement-task/SKILL.md) and [`review-task`](../review-task/SKILL.md):
implement → validate → review → move on.

## Discover the commands first

Don't assume script names — read `package.json` `scripts` and use what's actually defined.
Tooling lands in **T1 (Scaffold)**; if a check has no script yet, note it as N/A rather than
inventing one. Expected mapping for this stack (Vite · Vitest · TypeScript · ESLint · Prettier):

| Check | Typical command |
|-------|-----------------|
| Unit tests | `npm test` / `vitest run` (co-located `*.test.ts` in `domain/`) |
| Integration tests | `vitest run` over hook/data-layer suites (mock `PortfolioSource`) |
| Lint | `npm run lint` (ESLint) |
| Type checking | `npm run typecheck` / `tsc --noEmit` |
| Formatting | `npm run format:check` / `prettier --check .` |

Prefer running the whole suite; if a change is narrow, scope tests to the touched area first,
then run the full suite before declaring done.

## The loop

1. **Run every relevant check** — unit, integration, lint, type check, format.
2. **Read the failures.** Understand the root cause before changing anything.
3. **Fix them** with the smallest correct change:
   - Formatting → run the formatter's write mode (`prettier --write`).
   - Lint → fix the underlying issue; don't blanket-disable rules or add ignores to silence
     them. A targeted disable needs a one-line justification.
   - Type errors → fix the types precisely; **never** reach for `any`, `@ts-ignore`, or a cast
     to make an error disappear. The token-identity domain is why TS matters here.
   - Test failures → fix the code. Only change a test if the test itself is wrong, and say so.
4. **Re-run the full set.** Repeat from step 1 until everything is green.

## Guardrails while fixing

- Fix the cause, not the symptom. Don't delete/skip tests, weaken types, or loosen lint config
  just to pass.
- Don't touch code unrelated to the failure — no drive-by refactoring or reformatting.
- Keep the invariants in [`CLAUDE.md`](../../../CLAUDE.md) intact: `domain/` stays pure, views
  stay pure derived transforms (no refetch), canonical dedupe and failure isolation hold.
- If a failure exposes a real design problem rather than a quick fix, stop and surface it.

## Finish

Report the final state of each check (pass / N/A) and summarize what was fixed to get there.
Only declare the change validated when **all** relevant checks pass.
