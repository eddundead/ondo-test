# Scope of Work — Multi-Chain Portfolio Explorer

Implementation scope derived from [`REQUIREMENTS.md`](./REQUIREMENTS.md). Work is broken into
logical tasks; each lists purpose, affected modules, affected files, and estimated complexity.
**Phase 1 (Core, F1–F8)** is scoped at task grain; later phases are scoped at feature grain.

Complexity scale: **Low** (mechanical, <30 min) · **Medium** (design + care, ~1–2 hr) ·
**High** (correctness-critical or broad surface, ~half day).

## Progress tracker

Status: ⬜ Undone · 🟡 In progress · ✅ Done. Update as tasks complete.

| Task / Stage | Wave | Complexity | Status |
|--------------|------|-----------|--------|
| T1 — Scaffold & tooling | 0 | Low | ⬜ Undone |
| T2 — Domain types | 0 | Low | ⬜ Undone |
| T3 — Canonical identity | 1A | High | ⬜ Undone |
| T4 — normalize→aggregate→group→filter | 1A | Medium | ⬜ Undone |
| T5 — PortfolioSource + Mock + fixtures | 1B | Medium | ⬜ Undone |
| T6 — React Query hooks + status reduction | 2 | Medium | ⬜ Undone |
| T7 — Zustand UI store | 1C | Low | ⬜ Undone |
| T8 — Wallet manager UI | 3 | Medium | ⬜ Undone |
| T9 — Grouped portfolio view + header | 3 | Medium | ⬜ Undone |
| T10 — Search + all UX states | 1C/3 | Medium | ⬜ Undone |
| T11 — Run & verify Phase 1 E2E | 4 | Low–Med | ⬜ Undone |
| **Phase 1 — Core (F1–F8)** | — | — | ⬜ Undone |
| Phase 2 — Watchlist | — | Low–Med | ⬜ Undone |
| Phase 3 — Value over time | — | Medium | ⬜ Undone |
| Phase 4 — Tx history + pagination | — | Medium | ⬜ Undone |
| Phase 5 — Live integration | — | High | ⬜ Undone |

## Target module layout

```
src/
  domain/        pure logic, zero I/O — the refactor-proof core
    types.ts        TokenIdentity, Position, AggregatedAsset, FetchStatus, WalletInput, RawBalance, GroupKey
    identity.ts     resolveCanonicalId() — the fallback ladder
    normalize.ts    RawBalance[] → Position[]  (bigint math, price, spam)
    aggregate.ts    Position[] → AggregatedAsset[] + totals (dedupe/sum, partial flag)
    groupBy.ts      pure groupBy(positions, key)
    filter.ts       search predicate over Position
  data/
    PortfolioSource.ts          the interface (Seam 1)
    mock/MockPortfolioSource.ts  fixture-backed impl w/ latency + failure sim
    mock/fixtures.ts             hand-authored edge-case dataset
  hooks/
    useWalletBalances.ts   per-wallet React Query (Seam 1 consumer)
    usePortfolio.ts        fan-out → normalize → aggregate → status reduction
  store/uiStore.ts         Zustand: groupKey, search, wallets, (later) watchlist
  components/
    WalletManager.tsx          add/remove/sample wallets
    PortfolioHeader.tsx        total value + partial badge + grouping tabs + search
    GroupedPortfolio.tsx       renders groups + expandable rows
    states/{Loading,Empty,PartialFailureBanner,ErrorState}.tsx
  App.tsx  main.tsx  index.css
```

---

## Phase 1 — Core (F1–F8)

### T1 — Project scaffold & tooling
- **Purpose:** Runnable Vite + React + TS baseline with styling and data-layer deps, path aliases, and a QueryClient provider so every later task has a home.
- **Modules:** build/tooling, app root.
- **Files:** `package.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.env.example`, `.gitignore`.
- **Deps:** `@tanstack/react-query`, `zustand`, `tailwindcss` (+ postcss/autoprefixer), Radix primitives; dev: `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`.
- **Complexity:** **Low.**

### T2 — Domain types
- **Purpose:** The typed vocabulary every layer shares; encodes the flat-`Position[]` invariant and the mock↔live raw shape.
- **Modules:** `domain`.
- **Files:** `src/domain/types.ts`.
- **Complexity:** **Low.**

### T3 — Canonical identity resolution
- **Purpose:** The correctness heart (F3, N4). Resolve a dedupe key via the ladder: coingecko/provider id → `(chainId, contractAddress)` → curated cross-chain map → symbol+decimals (low-confidence). Keep bridged/wrapped distinct.
- **Modules:** `domain`.
- **Files:** `src/domain/identity.ts`, `src/domain/curatedMap.ts` (small majors table), `src/domain/identity.test.ts`.
- **Complexity:** **High** — collision, cross-chain, bridged, and no-id cases must all be correct; unit-tested.

### T4 — Normalize → aggregate → group → filter pipeline
- **Purpose:** Pure transforms from raw balances to grouped view (F4–F6, N2). `bigint` balance math, USD value, dedupe/sum, partial-total flag, `groupBy` key swap, search predicate.
- **Modules:** `domain`.
- **Files:** `src/domain/normalize.ts`, `aggregate.ts`, `groupBy.ts`, `filter.ts` (+ co-located `*.test.ts`).
- **Complexity:** **Medium** — logic is contained but precision (decimals) and dedupe correctness matter.

### T5 — PortfolioSource interface + Mock + fixtures
- **Purpose:** Seam 1. Interface both mock and Zerion satisfy; fixture dataset deliberately exercises every edge case; mock simulates latency and a per-wallet failure so partial-failure UX is real from day one.
- **Modules:** `data`.
- **Files:** `src/data/PortfolioSource.ts`, `src/data/mock/MockPortfolioSource.ts`, `src/data/mock/fixtures.ts`.
- **Fixture must include:** cross-chain USDC (ETH/Base/Arb), a symbol collision (two `UNI`), a spam token, a no-coingecko-id token, USDC.e (distinct, adjacent), one wallet that always fails, an empty wallet.
- **Complexity:** **Medium** — mostly data authoring, but the fixture quality *is* the demo.

### T6 — React Query per-wallet hooks + status reduction
- **Purpose:** F2, F7, N3. One query per wallet (failure isolation); reduce per-wallet statuses into aggregate UI state; expose derived `AggregatedAsset[]`, totals, and `FetchStatus[]`.
- **Modules:** `hooks`, consumes `data` + `domain`.
- **Files:** `src/hooks/useWalletBalances.ts`, `src/hooks/usePortfolio.ts`.
- **Complexity:** **Medium** — query fan-out + memoized derivation; retry/timeout config.

### T7 — Zustand UI store
- **Purpose:** N2. Client-only view state: `groupKey`, `search`, wallet list. Server data stays in React Query (kept separate deliberately).
- **Modules:** `store`.
- **Files:** `src/store/uiStore.ts`.
- **Complexity:** **Low.**

### T8 — Wallet manager UI
- **Purpose:** F1. Add/remove `(address, chainIds)`, a "load sample portfolio" button seeded from fixtures, basic address validation, dedupe.
- **Modules:** `components`, `store`.
- **Files:** `src/components/WalletManager.tsx`.
- **Complexity:** **Medium.**

### T9 — Grouped portfolio view + header
- **Purpose:** F5, F8. Grouping tabs (token/network/wallet), totals header with partial badge, group rows with per-group subtotal and expandable per-chain/per-wallet breakdown, chain-count badges.
- **Modules:** `components`.
- **Files:** `src/components/PortfolioHeader.tsx`, `src/components/GroupedPortfolio.tsx`.
- **Complexity:** **Medium** — the main visual surface; must re-derive purely on group switch.

### T10 — Search + all UX states
- **Purpose:** F6, F7. Search box wired to filter; loading skeletons, empty state, dismissible partial-failure banner with retry, full-page error+retry.
- **Modules:** `components`.
- **Files:** `src/components/states/{Loading,Empty,PartialFailureBanner,ErrorState}.tsx`, wiring in `App.tsx`.
- **Complexity:** **Medium** — state matrix must be exhaustive and never let a failed wallet block a good one.

### T11 — Run & verify Phase 1 end-to-end
- **Purpose:** Prove F1–F8 in the real app: switch groupings (no refetch), search, trigger the failing wallet → banner + retry, empty and all-fail paths. Run unit tests for identity/aggregate.
- **Modules:** all.
- **Files:** none new (may add `README.md` run notes).
- **Complexity:** **Low–Medium.**

---

## Later phases (feature-grain)

| Phase | Feature | Modules / key files | Complexity | Status |
|-------|---------|---------------------|------------|--------|
| **2** | Watchlist (F12) | `store/uiStore.ts` (persisted `Set<canonicalId>`), star toggle in `GroupedPortfolio.tsx`, watchlist filter | **Low–Medium** | ⬜ Undone |
| **3** | Value over time (F10) | `data/mock/snapshots.ts`, `components/ValueChart.tsx` (Recharts), header sparkline | **Medium** | ⬜ Undone |
| **4** | Tx history + pagination (F9, F11) | `hooks/useTransactions.ts`, `components/TxHistory.tsx`, pagination over groups | **Medium** | ⬜ Undone |
| **5** | Live integration (N1) | `data/zerion/ZerionPortfolioSource.ts`, server proxy (`/api/portfolio`), env flag; wallet-connect via wagmi injected then RainbowKit | **High** | ⬜ Undone |

---

## Dependency order & parallelization

The foundation is serial and gates everything; the middle opens into **three independent
tracks** (disjoint files → safe to build concurrently), then narrows at two sync points.

```
Wave 0  (serial — gates all)     T1 scaffold ──▶ T2 types
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
Wave 1  TRACK A (domain/)        TRACK B (data/)                TRACK C (store/ + states/)
  needs T2 only            needs T2 only                  needs T2 only
  • T3 identity            • T5 PortfolioSource iface     • T7 Zustand store
  • T4 aggregate           • T5 fixtures                  • T10 pure state comps
  • T4 groupBy             • T5 MockPortfolioSource         (Loading/Empty/Error)
  • T4 filter                                              • App shell/layout
  • T4 normalize*
        └───────────────────────────────┬───────────────────────────────┘
                                        ▼
Wave 2  (sync point 1)           T6 hooks — needs Track A pipeline + Track B mock
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
Wave 3  (parallel — separate component files)
                  T8 WalletManager   T9 GroupedPortfolio   T10 wire states
                                        │
Wave 4  (serial)                 T11 run & verify E2E
```

**Genuinely parallel**
- The three Wave-1 tracks touch disjoint directories (`domain/`, `data/`, `store/`+`components/states/`) — no file conflicts.
- Within T4, only `normalize.ts` depends on T3 (`*`); `aggregate.ts`/`groupBy.ts`/`filter.ts` need only types, so they run alongside T3.
- Wave-3 UI tasks are separate component files over the same finished hooks.

**Strictly serial**
- T1→T2 up front (nothing types-dependent starts until types exist).
- T6 is the chokepoint — first task needing *both* the pipeline and the mock.
- T11 last.

**Execution note:** for a project this size, single-threaded T1→T11 is usually fastest
(coordination overhead < wall-clock gain). Wave 1 *can* be fanned out across parallel agents
in isolated worktrees (disjoint files) if wall-clock matters. Either way, Phases 2–5 sit on
the finished core with **no `Position[]` refactor** — the point of the two-seam design.

## Out of scope (this pass)

Live provider calls, real wallet-connect, real historical data, mobile layout, auth/multi-user,
persistence beyond the watchlist. All are deferred to Phase 5 or explicitly mocked.
