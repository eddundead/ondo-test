---
name: implement-task
description: Use when implementing a task, feature, or phase from SCOPE.md (T1–T11 or Phases 2–5) in the portfolio-explorer codebase. Enforces the project invariants and a disciplined, minimal implementation workflow — follow existing conventions, reuse existing abstractions, keep changes minimal, avoid unrelated refactoring.
---

# Implement a task

Guidance for turning a scoped task into code without eroding the architecture. The core is
designed to be refactor-proof; the job is to add to it without breaking that.

## Ground yourself first

1. Find the task in [`SCOPE.md`](../../../SCOPE.md) — read its purpose, affected modules,
   affected files, and complexity. Respect the wave/dependency order.
2. Re-read the relevant **Invariants** in [`CLAUDE.md`](../../../CLAUDE.md) and the layer
   boundaries in [`ARCHITECTURE.md`](../../../ARCHITECTURE.md).
3. Look at neighbouring code before writing any. Match what is already there.

## The four rules

- **Follow existing conventions.** Mirror the surrounding code's naming, file layout, import
  style, and test placement (`*.test.ts` co-located). TypeScript throughout; model the
  token-identity domain precisely. Don't introduce a new pattern where one exists.
- **Reuse existing abstractions.** Types live in `domain/types.ts`; identity resolution in
  `identity.ts`; the `PortfolioSource` seam, `groupBy`, and the Zustand store already exist as
  the intended extension points. Extend them — don't fork parallel versions.
- **Keep it minimal.** Implement exactly what the task asks. No speculative config, options,
  or abstraction for phases not yet being built. Smallest change that satisfies the task.
- **No unrelated refactoring.** Don't rename, reformat, or "clean up" code outside the task.
  The mock fixtures' edge cases (failing wallet, cross-chain USDC, symbol collision, spam,
  no-coingecko-id token, USDC.e) are deliberate — never "fix" them.

## Do not break these invariants

- One flat `Position[]` is the single source of truth. Grouping/search/totals are **pure
  derived transforms** — never a refetch. A view change that triggers a network call is a bug.
- **Failure isolation:** one React Query per wallet; a failed wallet never blocks a succeeded
  one. Aggregate UI state is a reduction over per-wallet statuses.
- **Canonical identity over symbol** — dedupe on `canonicalId` via the resolution ladder, never
  on symbol alone. Bridged/wrapped stay distinct (USDC.e ≠ USDC, WETH ≠ ETH).
- **Two seams stay source-agnostic:** everything downstream of `PortfolioSource` and
  `WalletInput` is identical in mock and live modes. API key stays server-side only.
- **`domain/` is pure:** no React, no I/O, no side effects. Keep it unit-testable in isolation.

## Finish

1. Add/adjust co-located unit tests for pure logic touched.
2. Verify the change (build/typecheck, run affected tests).
3. Mark the task's status in the `SCOPE.md` progress tracker (⬜ → 🟡 → ✅).
4. **Summarize the changes, explain the design decisions, then stop** — do not roll on to the
   next task without being asked.
