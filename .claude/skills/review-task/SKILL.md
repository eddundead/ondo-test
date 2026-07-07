---
name: review-task
description: Use when reviewing a completed task, change, or diff in the portfolio-explorer codebase — before marking a SCOPE.md task done or moving to the next one. Evaluates correctness, readability, maintainability, security, performance, edge cases, extensibility, and consistency with the repository, then identifies concrete improvements.
---

# Review a task

Guidance for reviewing a change before it is considered done. Pairs with
[`implement-task`](../implement-task/SKILL.md): implement, then review, then move on.

## Ground yourself first

1. Identify the task in [`SCOPE.md`](../../../SCOPE.md) and re-read its purpose and affected
   files — the change should do exactly that, no more, no less.
2. Re-read the **Invariants** in [`CLAUDE.md`](../../../CLAUDE.md) and the layer boundaries in
   [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) — these are the acceptance bar.
3. Read the actual diff and the code around it before judging.

## Evaluate every dimension

- **Correctness.** Does it satisfy the task? Bigint balance math loses no precision. Canonical
  dedupe collapses cross-chain, never merges distinct assets (USDC.e ≠ USDC, WETH ≠ ETH).
  Aggregate status is a correct reduction over per-wallet statuses; totals flagged partial when
  any wallet errored.
- **Readability.** Clear names, small pure functions, obvious control flow. Reads like the
  surrounding code — a reviewer understands it without asking.
- **Maintainability.** Change is localized; `domain/` stays pure (no React, no I/O). No hidden
  coupling across layers; each layer depends only inward.
- **Security.** API key stays server-side only — never in the browser bundle or client code.
  No secrets in fixtures/logs. Provider input treated as untrusted; spam flag respected.
- **Performance.** View changes are pure derived transforms, never a refetch. No accidental
  O(n²) over positions; grouping/search/aggregation scale with a realistic wallet count.
- **Edge cases.** The deliberate mock cases are exercised: failing wallet, cross-chain USDC,
  symbol collision, spam, no-coingecko-id token, USDC.e. Also empty portfolio, all-error,
  zero-balance, missing price/decimals, low-confidence identity.
- **Extensibility.** The two seams stay source-agnostic — mock and live behave identically
  downstream of `PortfolioSource` and `WalletInput`. Adding a `GroupKey` or a later phase
  needs no `Position[]` refactor.
- **Consistency with the repository.** Matches existing conventions, naming, file layout, and
  test placement (`*.test.ts` co-located). Reuses existing abstractions instead of forking
  parallel ones. No unrelated refactoring or reformatting.

## Finish

1. List findings grouped by dimension, each with severity (blocker / should-fix / nice-to-have)
   and a concrete, minimal fix.
2. Call out any invariant violation as a **blocker** — these are non-negotiable.
3. **Identify the improvements to make before moving on**, then stop for a decision — do not
   silently apply large changes or roll on to the next task without being asked.
