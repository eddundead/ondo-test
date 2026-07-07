# Architecture — Multi-Chain Portfolio Explorer

Intended architecture for the portfolio explorer. This is a **design-phase** document (no
code yet); it describes the target the implementation in [`SCOPE.md`](./SCOPE.md) builds
toward, grounded in the invariants in [`CLAUDE.md`](./CLAUDE.md) and the requirements in
[`REQUIREMENTS.md`](./REQUIREMENTS.md).

## Overall architecture

A **read-only, unidirectional aggregation pipeline**. Data flows one way — provider → normalize
→ aggregate → derive view — and never backward. The app fans out one request per
`(wallet × networks)`, normalizes each token to a canonical identity, collapses cross-chain
duplicates into a flat `Position[]`, and lets the UI derive grouped/searched views on demand.

```
                        ┌──────────────── UI (React) ────────────────┐
 WalletInput[] ──▶ hooks/ ──▶ data/ (PortfolioSource, per wallet)     │
                    │            │                                     │
                    │            ▼                                     │
                    │        RawBalance[] + FetchStatus[]              │
                    │            │                                     │
                    │            ▼  domain/ (pure)                     │
                    │        normalize ─▶ Position[]                   │
                    │            │                                     │
                    │            ▼                                     │
                    │        aggregate ─▶ AggregatedAsset[] + totals   │
                    │            │                                     │
                    │   ┌────────┴─────────┐  (pure, re-derived)       │
                    │   ▼                  ▼                           │
                    │ filter(search)   groupBy(GroupKey) ──▶ groups ───┘
                    │                                          ▲
                    └── store/ (Zustand: groupKey, search, wallets) ───┘
```

**Layer boundaries** (each owns one responsibility, depends only inward):

| Layer | Dir | Responsibility | Depends on |
|-------|-----|----------------|-----------|
| Domain | `src/domain/` | Pure logic: types, identity, normalize, aggregate, groupBy, filter. Zero I/O, zero React. | nothing |
| Data | `src/data/` | Seam 1 — fetch raw balances per wallet; capture success/failure. Mock now, Zerion later. | `domain` (types) |
| Hooks | `src/hooks/` | Orchestrate fan-out + derivation; bridge async data into React. | `data`, `domain` |
| Store | `src/store/` | Client-only view state (groupKey, search, wallets, watchlist). | nothing |
| Components | `src/components/` | Render groups + all UX states; dispatch view-state changes. | `hooks`, `store`, `domain` |

**The architectural bet:** the store holds one flat, normalized `Position[]` (derived, cached
in React Query). Grouping/search/totals are **pure transforms**, never refetches. Switching
grouping = swapping a `GroupKey`. This is what keeps regrouping refactor-free.

## Tech stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | React + TypeScript (Vite) | Grouped/nested views; TS essential for the token-identity domain |
| Data fetching | TanStack Query (React Query) | Per-wallet queries → free loading/error/partial-failure states, caching, retries |
| View state | Zustand | groupKey, search, wallet list, watchlist. Server data stays in React Query |
| Provider (live) | Zerion behind a server-side proxy | Normalized multi-chain balances + USD prices; key never in bundle |
| Styling | Tailwind + Radix primitives | Desktop-first tables; accessible group/expand |
| Charts (Phase 3) | Recharts | Portfolio-value-over-time line |
| Testing | Vitest (+ React Testing Library for UI) | Fast unit tests co-located with pure domain logic |
| Wallet-connect (Phase 5) | wagmi injected → RainbowKit | Optional address source; read-only, no signer |

## Project structure

```
ondo-test/
├── REQUIREMENTS.md          analysis: F/N reqs, edge cases, risks
├── SCOPE.md                 task breakdown, parallelization, progress tracker
├── ARCHITECTURE.md          this file
├── CLAUDE.md                repo-scoped invariants, glossary, conventions
├── .env.example             names the server-held provider key (never committed real)
├── index.html               Vite HTML entry
└── src/
    ├── main.tsx             ★ app entry — mounts React, wraps in QueryClientProvider
    ├── App.tsx              ★ top-level composition; selects UX state, lays out shell
    ├── index.css            Tailwind directives
    ├── domain/              ★★ pure core — the refactor-proof heart
    │   ├── types.ts            TokenIdentity, Position, AggregatedAsset, FetchStatus, RawBalance, WalletInput, GroupKey
    │   ├── identity.ts         resolveCanonicalId() — the fallback ladder
    │   ├── curatedMap.ts       hand-maintained cross-chain majors table
    │   ├── normalize.ts        RawBalance[] → Position[]
    │   ├── aggregate.ts        Position[] → AggregatedAsset[] + totals (+ partial flag)
    │   ├── groupBy.ts          pure groupBy(positions, GroupKey)
    │   ├── filter.ts           search predicate over Position
    │   └── *.test.ts           co-located unit tests
    ├── data/                ★ Seam 1 — data source
    │   ├── PortfolioSource.ts       the interface
    │   ├── mock/
    │   │   ├── MockPortfolioSource.ts   fixture-backed, simulates latency + failure
    │   │   └── fixtures.ts              edge-case dataset (the demo)
    │   └── zerion/                      ZerionPortfolioSource.ts (Phase 5)
    ├── hooks/               ★ orchestration
    │   ├── useWalletBalances.ts     per-wallet React Query
    │   └── usePortfolio.ts          fan-out → normalize → aggregate → status reduction
    ├── store/
    │   └── uiStore.ts               Zustand: groupKey, search, wallets, watchlist
    └── components/
        ├── WalletManager.tsx        add/remove/sample wallets
        ├── PortfolioHeader.tsx      totals + partial badge + grouping tabs + search
        ├── GroupedPortfolio.tsx     groups + expandable rows
        └── states/                  Loading, Empty, PartialFailureBanner, ErrorState
```

### Most important directories & entry points

- **`src/main.tsx`** — ★ runtime entry. Mounts React and installs `QueryClientProvider`. First file to read.
- **`src/App.tsx`** — ★ composition root. Reads the reduced UX state and picks what to render (loading / empty / partial / error / loaded).
- **`src/domain/`** — ★★ the most important directory. Pure, testable, framework-free; it encodes every correctness-critical decision (identity, dedupe, grouping). If you understand `domain/`, you understand the app.
- **`src/data/PortfolioSource.ts`** — ★ the seam. The one interface that mock and live both implement; the injection point for going live.
- **`src/hooks/usePortfolio.ts`** — ★ the orchestration hub where fan-out, derivation, and status-reduction meet.

## Coding conventions

- **TypeScript everywhere;** model the token-identity domain precisely — it's the reason TS matters here.
- **`domain/` is pure:** no React, no I/O, no side effects, no `Date.now()`/randomness in logic paths. Deterministic in → deterministic out. This is what makes it unit-testable and reusable.
- **Server data vs view state are never mixed:** async/server data lives in React Query; UI selections (groupKey, search, wallets, watchlist) live in Zustand.
- **Never trigger a refetch to change a view.** A view change that hits the network violates the flat-`Position[]` invariant.
- **Balance math on `bigint` raw** (`balance = raw / 10^decimals`); avoid float precision loss.
- **Edge cases are first-class** — the mock fixtures deliberately include a failing wallet, cross-chain USDC, a symbol collision, spam, a no-coingecko-id token, and a USDC.e distinct case. Don't "clean them up"; they are the demo.
- **Naming:** `PascalCase` components/types, `camelCase` functions/vars, co-located `*.test.ts`. One responsibility per module; keep `domain/` files small and single-purpose.
- **Desktop-first;** no mobile requirement this pass.

## Testing strategy

Pyramid weighted toward the pure core, where correctness lives.

| Level | Target | Tool | What it proves |
|-------|--------|------|----------------|
| **Unit (primary)** | `domain/identity.ts`, `aggregate.ts`, `normalize.ts`, `groupBy.ts`, `filter.ts` | Vitest | The correctness-critical logic: symbol collisions don't merge, cross-chain USDC does, USDC.e stays distinct, bigint decimal math, dedupe/sum, partial-total flag, group-key swap |
| **Component** | `states/*`, `GroupedPortfolio` | Vitest + RTL | Each UX state renders correctly; grouping switch re-derives without refetch |
| **Integration** | `usePortfolio` over `MockPortfolioSource` | Vitest + RTL | Per-wallet failure isolation: one wallet fails → others still render + partial banner |
| **E2E (manual, T11)** | Full app on mock data | Dev server + `/verify` | Switch groupings, search, trigger the failing wallet → banner + retry; empty and all-fail paths |

Because `domain/` is pure and `data/` is behind an interface, **most behavior is testable
without a browser or a network** — the mock is a first-class test fixture, not just a dev stub.

## Request lifecycle

A "request" = the user submits/updates the wallet list. Trace, end to end:

1. **Input.** `WalletManager` writes `WalletInput[]` (`{address, label?, chainIds}`) into the Zustand store (deduped, validated). Manual entry now; wallet-connect appends to the same list later.
2. **Fan-out.** `usePortfolio` spawns **one `useWalletBalances` query per wallet** (React Query). Isolation is structural — each query has independent loading/error/retry.
3. **Fetch.** Each query calls the injected `PortfolioSource.fetchWalletBalances({address, chainIds})`. Mock returns fixtures (with simulated latency + a deliberately failing wallet); live routes through the server proxy. Returns `{ raw: RawBalance[], status: FetchStatus }`.
4. **Normalize** (`domain/normalize.ts`). Each `RawBalance` → `Position`: resolve `canonicalId` via the ladder, compute `balance` from `bigint` raw + decimals, attach price/value, carry `isSpam`.
5. **Aggregate** (`domain/aggregate.ts`). Collapse same-`canonicalId` positions across chains/wallets into `AggregatedAsset[]`; sum totals; set the **partial** flag if any wallet's `FetchStatus` is `error`.
6. **Reduce status.** `usePortfolio` reduces the per-wallet `FetchStatus[]` into one aggregate UX state: loading / empty / loaded / partial-failure / total-failure.
7. **Derive view.** `filter(search)` then `groupBy(groupKey)` — both pure, both reading view state from Zustand. No network touched.
8. **Render.** `App` switches on the aggregate UX state; `PortfolioHeader` shows totals (+ partial badge), `GroupedPortfolio` renders groups with expandable per-chain/per-wallet breakdown; a dismissible banner offers retry for failed wallets.
9. **Re-derive on view change.** Changing `groupKey` or `search` updates Zustand → steps 7–8 re-run purely. **Steps 2–6 do not re-execute** — no refetch. That non-re-execution *is* the core architectural guarantee.

## Dependency injection / service architecture

Lightweight, interface-first DI — no framework, just a seam and a factory.

- **The service is `PortfolioSource`** — a single interface (`fetchWalletBalances`). Two implementations: `MockPortfolioSource` (now) and `ZerionPortfolioSource` (Phase 5). Identical return shape, so nothing downstream knows or cares which is active.
- **Injection point:** a small factory/provider selects the implementation from an **env flag** (e.g. `VITE_DATA_SOURCE=mock|zerion`). The `hooks/` layer depends on the *interface*, never on a concrete class — going live is flipping the flag and writing the adapter.
- **Second seam — address source:** `WalletInput` decouples *how a wallet enters* (manual entry, later wallet-connect) from the pipeline. Both feed the same list; the pipeline is source-agnostic.
- **Why this shape:** it keeps the correctness-critical `domain/` core fully isolated and testable against the mock, and makes the two "real world" integrations (provider, wallet) additive rather than invasive — the whole point of the mock-first plan.
