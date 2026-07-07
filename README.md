# Portfolio Explorer

A read-only, desktop-first **multi-chain portfolio explorer**. It takes a set of
`(wallet address, network)` pairs, reads each wallet's on-chain token balances across chains
(via a provider like Zerion, not raw RPC), and merges them into **one unified portfolio view**
— regroupable by token / network / wallet, searchable, and resilient to partial failures.

**Mock-first:** the app runs today against a fixture dataset. The real provider and
wallet-connect drop in later behind two seams with no core refactor.

> **Status:** ✅ **Phase 1 (Core) complete.** Full mock-data pipeline, per-wallet React Query
> with partial-failure isolation, token/network/wallet grouping, search, spam toggle, and all
> UX states — 54 tests green (incl. end-to-end App tests) + production build verified. Phases 2–5
> (watchlist, value-over-time, tx history + pagination, live Zerion + wallet-connect) are next.
> See [`SCOPE.md`](./SCOPE.md) for the task tracker.

## Documentation map

| Doc | What's in it |
|-----|--------------|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Problem restatement, functional/non-functional requirements |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Target architecture, layer boundaries, request lifecycle, tech-stack rationale |
| [`SCOPE.md`](./SCOPE.md) | Phased task breakdown (T1–T11 + Phases 2–5) and progress tracker |
| [`CLAUDE.md`](./CLAUDE.md) | Invariants, glossary, and conventions for working in the repo |

## Getting started

```bash
npm install
cp .env.example .env      # defaults to mock mode — no API key needed
npm run dev               # start the Vite dev server
```

The app runs in **mock mode** out of the box (`VITE_DATA_SOURCE=mock`), so no provider key is
required. The live Zerion adapter and its server-side key arrive in Phase 5 — see
[Environment](#environment).

## Scripts

Defined in [`package.json`](./package.json):

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Start the dev server with HMR |
| `npm run build` | `tsc -b && vite build` | Type-check the project and produce a production build |
| `npm run preview` | `vite preview` | Serve the built `dist/` locally |
| `npm test` | `vitest` | Run the unit/integration suite (watch mode; `vitest run` for CI) |
| `npm run typecheck` | `tsc -b` | Type-check without emitting |

> Lint/format scripts aren't wired up yet — TypeScript (`typecheck`) and the test suite are the
> current quality gates. Keep the existing file style consistent when editing.

## Project structure

```
portfolio-explorer/
├─ src/
│  ├─ domain/               pure logic, zero I/O — the refactor-proof core
│  │  ├─ types.ts             TokenIdentity, Position, AggregatedAsset, FetchStatus, WalletInput, RawBalance, GroupKey
│  │  ├─ identity.ts          resolveCanonicalId() — the canonical-id fallback ladder
│  │  ├─ curatedMap.ts        small hand-maintained cross-chain map for majors
│  │  ├─ identity.test.ts     co-located unit tests
│  │  ├─ normalize.ts         RawBalance[] → Position[] (bigint math, price, spam)
│  │  ├─ aggregate.ts         Position[] → AggregatedAsset[] + totals (dedupe/sum)
│  │  ├─ groupBy.ts           pure groupBy(positions, key)
│  │  ├─ groupedView.ts       groupBy ∘ aggregate — the per-group asset rows the UI renders
│  │  ├─ filter.ts            search predicate over Position
│  │  └─ chains.ts            chain names / badges for display
│  ├─ data/                 Seam 1 — fetch raw balances per wallet
│  │  ├─ PortfolioSource.ts   the interface both mock and Zerion satisfy
│  │  ├─ source.ts            factory selecting impl from VITE_DATA_SOURCE
│  │  └─ mock/                MockPortfolioSource + hand-authored edge-case fixtures
│  ├─ hooks/                React Query fan-out (useWalletBalances) + derivation (usePortfolio)
│  ├─ store/                Zustand UI store (groupKey, search, wallets, showSpam)
│  ├─ lib/                  cn() + display formatters
│  ├─ components/           WalletManager, PortfolioHeader, GroupedPortfolio, states/
│  ├─ test/setup.ts         Vitest + Testing Library setup
│  ├─ App.tsx  main.tsx  index.css
├─ .claude/skills/          custom Claude Code workflow skills (see below)
├─ index.html  vite.config.ts  tsconfig*.json  tailwind.config.js  postcss.config.js
├─ .env.example  .gitignore
└─ REQUIREMENTS.md  ARCHITECTURE.md  SCOPE.md  CLAUDE.md
```

Load the app and click **Load sample portfolio** to explore two funded wallets, an
always-failing wallet (partial-failure banner), and an empty wallet.

### Layer boundaries

Each layer owns one responsibility and depends only inward — `domain` depends on nothing.

| Layer | Dir | Responsibility |
|-------|-----|----------------|
| Domain | `src/domain/` | Pure logic: types, identity, normalize, aggregate, groupBy, filter. Zero I/O, zero React. |
| Data | `src/data/` | Seam 1 — fetch raw balances per wallet; capture success/failure. Mock now, Zerion later. |
| Hooks | `src/hooks/` | Orchestrate the per-wallet fan-out + derivation; bridge async data into React. |
| Store | `src/store/` | Client-only view state (groupKey, search, wallets, watchlist). |
| Components | `src/components/` | Render groups + all UX states; dispatch view-state changes. |

## The pipeline

Data flows one way — provider → normalize → aggregate → derive view — and never backward.

```
WalletInput[] → PortfolioSource (per wallet) → RawBalance[] + FetchStatus[]
             → normalize (canonical id, bigint math, price)  → Position[]
             → aggregate (dedupe/sum, partial flag)          → AggregatedAsset[] + totals
             → filter (search) → groupBy (GroupKey)          → rendered groups
```

## Conventions

- **TypeScript throughout.** The token-identity domain is why TS matters here — model it
  precisely; avoid `any`.
- **`domain/` stays pure** — no React, no I/O, no side effects. Unit-testable in isolation.
- **Tests co-located** as `*.test.ts` next to the code they cover (Vitest + Testing Library).
- **Server data in React Query, view state in Zustand.** Keep them separate.
- **Never introduce a refetch to change a view.** Grouping/search/totals are pure derived
  transforms over the flat `Position[]`. A view change that hits the network is a bug.
- **Edge cases are first-class.** The mock fixtures deliberately include a failing wallet,
  cross-chain USDC, a symbol collision, spam, a no-coingecko-id token, and a USDC.e case —
  don't "clean these up," they *are* the demo.
- **Desktop-first**; no mobile requirement this pass.

### Invariants (do not break)

1. One flat `Position[]` is the single source of truth; grouping/search/totals are pure
   derived transforms, never a refetch.
2. **Failure isolation** — one React Query per wallet; a failed wallet never blocks a succeeded
   one. Aggregate UI state is a reduction over per-wallet statuses.
3. **Canonical identity over symbol** — dedupe on `canonicalId` via the resolution ladder.
4. **Bridged/wrapped stay distinct** — USDC.e ≠ USDC, WETH ≠ ETH; displayed adjacent.
5. **API key is server-side only** — it never enters the browser bundle.
6. **Two seams, source-agnostic core** — everything downstream of `PortfolioSource` and
   `WalletInput` is identical in mock and live modes.

Full rationale in [`CLAUDE.md`](./CLAUDE.md).

## Glossary

| Term | Meaning |
|------|---------|
| **Position** | Atomic unit: one token, one wallet, one chain. Stable id `${wallet}:${chainId}:${address}`. |
| **AggregatedAsset** | Cross-chain/cross-wallet rollup of one canonical asset; summed totals + the `Position[]` breakdown. |
| **TokenIdentity** | Canonical identity + display metadata (`canonicalId`, symbol, name, decimals, logo, `isSpam`). |
| **canonicalId** | Cross-chain dedupe key. Ladder: ① coingecko/provider id → ② `(chainId, address)` → ③ curated map → ④ `symbol+decimals` (low-confidence). |
| **FetchStatus** | Per-wallet result (`success` \| `error` \| `loading`) driving partial-failure UX. |
| **WalletInput** | `{ address, label?, chainIds }` — how a wallet enters the app, decoupled from how it got there. |
| **GroupKey** | `'token' \| 'network' \| 'wallet'` — the accessor selector for `groupBy`. |
| **PortfolioSource** | Seam 1 interface: `fetchWalletBalances({address, chainIds}) → RawBalance[]` (throws on error; `FetchStatus` derived at the hook layer). Impls: mock now, Zerion later. |
| **Partial total** | A total flagged incomplete because ≥1 wallet errored — annotated, never silently understated. |

## Environment

Configured via `.env` (copy from [`.env.example`](./.env.example)):

| Var | Purpose |
|-----|---------|
| `VITE_DATA_SOURCE` | Seam 1 selector — `mock` (default, no key) or `zerion` (live, Phase 5). |
| `ZERION_API_KEY` | **Server-side only.** Read by the proxy; intentionally un-prefixed so it never reaches the bundle. Blank in mock mode. |

## Tooling / stack

React 18 + TypeScript (Vite) · TanStack Query (per-wallet fetching) · Zustand (view state) ·
Tailwind + Radix primitives (desktop tables, accessible expand) · Recharts (stretch chart) ·
Vitest + Testing Library. Zerion behind a server-side proxy in the live phase.

## Claude Code skills

Custom workflow skills live in [`.claude/skills/`](./.claude/skills/) and encode the
implement → validate → review loop against this repo's invariants:

| Skill | Use it to |
|-------|-----------|
| `implement-task` | Implement a SCOPE.md task with minimal, convention-following changes. |
| `validate` | Run all checks (tests, typecheck, lint/format where available) and loop until green. |
| `review-task` | Review a change across correctness, readability, security, performance, and 4 more dimensions. |
