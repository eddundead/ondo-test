# CLAUDE.md

Guidance and shared definitions for Claude Code working in this repository.
See [`REQUIREMENTS.md`](./REQUIREMENTS.md) for the full analysis and [`SCOPE.md`](./SCOPE.md)
for the task breakdown and build order.

## Project

Multi-chain **portfolio explorer** — a read-only app that merges token balances across
wallets and networks into one unified view, with flexible grouping (token / network /
wallet), search, and graceful partial-failure handling. **Mock-first**, built so the real
provider and wallet-connect drop in later behind two seams with no core refactor.

## Invariants (do not break)

1. **One flat `Position[]` is the single source of truth.** Grouping, search, and totals are
   **pure derived transforms** — never a refetch. Switching grouping = swapping a `GroupKey`.
2. **Failure isolation.** One React Query per wallet. A failed wallet never blocks a
   succeeded wallet's data. Aggregate UI state is a *reduction* over per-wallet statuses.
3. **Canonical identity over symbol.** Tokens dedupe on `canonicalId`, resolved via a
   fallback ladder — never on symbol alone.
4. **Bridged/wrapped stay distinct.** USDC.e ≠ USDC, WETH ≠ ETH — different `canonicalId`,
   displayed adjacent. Never auto-merge different-risk assets.
5. **API key is server-side only.** Live provider calls route through a proxy; the key never
   enters the browser bundle. (Mock mode short-circuits the network but keeps this boundary.)
6. **Two seams, source-agnostic core.** Everything downstream of `PortfolioSource` and
   `WalletInput` is identical in mock and live modes.

## Glossary / common definitions

| Term | Meaning |
|------|---------|
| **Position** | Atomic unit: one token, one wallet, one chain. Stable id `${wallet}:${chainId}:${address}`. |
| **AggregatedAsset** | Cross-chain/cross-wallet rollup of one canonical asset; holds summed totals + the `Position[]` breakdown. |
| **TokenIdentity** | Canonical identity + display metadata (`canonicalId`, symbol, name, decimals, logo, `isSpam`). |
| **canonicalId** | The cross-chain dedupe key. Resolution ladder: ① coingecko/provider asset id → ② `(chainId, contractAddress)` → ③ curated cross-chain map → ④ `symbol+decimals` (low-confidence flag). |
| **FetchStatus** | Per-wallet result (`success` \| `error` \| `loading`) driving partial-failure UX. |
| **RawBalance** | Provider-shaped pre-normalization record; identical between mock and Zerion adapters. |
| **WalletInput** | `{ address, label?, chainIds }` — how a wallet enters the app, decoupled from *how it got there*. |
| **GroupKey** | `'token' \| 'network' \| 'wallet'` — the accessor selector for `groupBy`. |
| **PortfolioSource** | Seam 1 interface: `fetchWalletBalances({address, chainIds}) → RawBalance[]` (throws on error; per-wallet `FetchStatus` is derived at the hook layer from React Query state). Impls: `MockPortfolioSource`, later `ZerionPortfolioSource`. |
| **Partial total** | A portfolio total flagged incomplete because ≥1 wallet errored. Must be annotated, never silently understated. |
| **Low-confidence** | Flag on an identity resolved only by ladder rung ④ (symbol+decimals). |

## The pipeline

```
WalletInput[] → PortfolioSource (per wallet) → RawBalance[] + FetchStatus[]
             → normalize (canonical id, bigint math, price)  → Position[]
             → aggregate (dedupe/sum, partial flag)          → AggregatedAsset[] + totals
             → filter (search) → groupBy (GroupKey)          → rendered groups
```

- **Balance math:** `rawBalance: bigint` (on-chain integer) is truth; `balance = raw / 10^decimals`. Convert carefully — no float precision loss.
- **Server data** lives in React Query. **View state** (groupKey, search, wallet list, watchlist) lives in Zustand. Keep them separate.

## Module layout

```
src/domain/      pure logic, zero I/O — types, identity, normalize, aggregate, groupBy, filter
src/data/        PortfolioSource interface + mock/ (fixtures) + zerion/ (later)
src/hooks/       React Query per-wallet fetch + portfolio derivation
src/store/       Zustand UI store
src/components/  WalletManager, PortfolioHeader, GroupedPortfolio, states/
```

## Tech stack

React + TypeScript (Vite) · TanStack Query (per-wallet fetching → loading/error/partial states)
· Zustand (view state) · Tailwind + Radix (desktop tables, accessible expand) · Recharts
(stretch chart) · Zerion behind a server-side proxy (live phase).

## Conventions

- **TypeScript throughout**; the token-identity domain is the reason TS matters here — model it precisely.
- **Pure `domain/` layer:** no React, no I/O, no side effects. Unit-testable in isolation (`*.test.ts` co-located).
- **Edge cases are first-class:** the mock fixtures deliberately include a failing wallet, cross-chain USDC, a symbol collision, spam, a no-coingecko-id token, and a USDC.e distinct case. Don't "clean these up" — they *are* the demo.
- **Desktop-first;** no mobile requirement this pass.
- **Never introduce a refetch to change a view.** If a view change triggers a network call, the flat-`Position[]` invariant has been violated.

## Status

Design complete (`REQUIREMENTS.md`, `SCOPE.md`). Building **Phase 1 — Core (F1–F8)** on mock
data. Phases 2–5 (watchlist, value-over-time, tx history + pagination, live integration) sit
on the finished core with no `Position[]` refactor.
