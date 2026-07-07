# Multi-Chain Portfolio Explorer — Requirements

Requirements analysis for the portfolio explorer. This is the shared understanding locked
before implementation; the build follows the phased scope at the end.

## Restatement

A **read-only, desktop-first web app** that takes a set of `(wallet address, network)` pairs,
reads each wallet's on-chain token balances across multiple chains (via a provider like
Zerion/Zapper rather than raw RPC), and **merges them into one unified portfolio view**.

The hard part is not fetching — it's **reconciliation**:

1. **Identity** — the same economic asset appears on many chains (USDC on Ethereum, Base,
   Arbitrum) and under colliding symbols (two different tokens both called `UNI`). Resolve a
   *canonical identity* per token so cross-chain holdings collapse into one row — and do
   *not* wrongly merge distinct assets (USDC vs USDC.e, ETH vs WETH).
2. **Presentation** — the same underlying data must be **regroupable** by token / network /
   wallet on demand, plus searchable/filterable, **without re-fetching or restructuring**.
3. **Resilience** — wallets are fetched independently; the UI degrades gracefully across
   loading / empty / partial-failure / total-failure states. A failed wallet never blocks a
   succeeded wallet's data.

**Core design bet:** keep **one flat, normalized `Position[]`** as the single source of
truth; every view (grouping, search, totals) is a **pure derived transform**, never a
refetch. Switching grouping = swapping a `groupBy` key.

## Functional Requirements

| # | Requirement | Notes |
|---|-------------|-------|
| F1 | Accept multiple `(wallet, network)` inputs | Mocked address+network pairs; live wallet-connect is a later bonus |
| F2 | Fetch token balances per wallet across networks | One query per wallet for failure isolation |
| F3 | Normalize each raw token to a **canonical identity** | Ladder: coingecko/provider asset id → (chainId, contractAddress) → curated map → symbol+decimals (low-confidence flag) |
| F4 | Aggregate: dedupe same asset across chains/wallets, sum balances & USD value | Produces `AggregatedAsset[]` + portfolio total |
| F5 | Group by **token (default) / network / wallet** | Pure client transform over `Position[]`; no refactor to switch |
| F6 | Search / filter | Match on symbol / name / address before grouping |
| F7 | Handle loading / empty / partial-failure / total-failure states | Partial: render successes + dismissible banner ("2 of 5 wallets failed") with retry |
| F8 | Annotate totals as **partial** when any wallet errored | Totals must not silently understate |
| F9 (stretch) | Transaction history | Separate per-wallet query |
| F10 (stretch) | Portfolio value over time | Mocked `PortfolioSnapshot[]` → Recharts line |
| F11 (stretch) | Pagination | Over groups or positions-within-group |
| F12 (stretch) | Watchlist | `Set<canonicalId>` in Zustand, persisted; star toggle + filter view |

## Non-Functional Requirements

| # | Requirement | Notes |
|---|-------------|-------|
| N1 | **API key never in the browser bundle** | Server-side proxy injects key from env; `.env` gitignored, ship `.env.example` |
| N2 | Regrouping is refactor-free | Enforced by the flat-`Position[]` + pure `groupBy` invariant |
| N3 | Failure isolation | Independent per-wallet queries; aggregate UI = reduction over per-wallet statuses |
| N4 | Correctness of token identity over convenience | Never merge different-risk assets (bridged/wrapped stay distinct by default) |
| N5 | Type safety | TS throughout the token-identity domain model |
| N6 | Desktop-first | No mobile requirement |
| N7 | Reasonable performance | Client-side grouping/search stays responsive; respect provider rate limits (Zerion ~10 RPS) |
| N8 | Graceful loading UX | Skeletons, no layout jank between states |

## Assumptions

- Provider returns normalized multi-chain balances **with USD prices**, avoiding raw RPC per token.
- A free/email-tier API key is available; call budget is not a hard constraint during iteration.
- Wallet input can be **mocked** (address+network pairs); live wallet-connect is optional polish.
- Historical data for the value-over-time chart is **mocked**.
- Prices are point-in-time snapshots; no live streaming needed.
- "Network" = EVM-style numeric `chainId`.
- Bridged (USDC.e) and wrapped (WETH) variants stay **distinct by default**, displayed adjacent.
- Read-only: no transactions are ever signed/sent.

## Edge Cases

- **Symbol collisions** — two unrelated tokens sharing a symbol (`UNI`) must not merge.
- **Cross-chain same asset** — USDC on ETH/Base/Arbitrum collapses to one row.
- **Bridged vs native** — USDC.e ≠ native USDC; stay separate.
- **Native vs wrapped** — ETH vs WETH kept distinct.
- **No canonical id** — fall back to (chain,address), then symbol+decimals with a low-confidence flag.
- **Spam / scam tokens** — provider `isSpam` flag; filter with user override.
- **Zero balances / dust** — decide whether to hide tiny/zero positions.
- **Missing price** — token with balance but no USD price.
- **Decimals / bigint math** — raw integer balance ÷ 10^decimals; avoid float precision loss.
- **Partial failure** — some wallets error, some succeed → render partial + banner + retry.
- **Total failure** — all wallets error → full-page error + retry.
- **Empty portfolio** — all succeed, zero positions → "No tokens found".
- **Duplicate wallet input** — same address entered twice; dedupe.
- **Same asset, same wallet, same chain** — one stable `Position` id (`${wallet}:${chainId}:${address}`).
- **Rate limiting / timeouts** — provider 429 / slow response; retry with backoff.
- **Pagination × grouping/search** — page state survives regroup/filter changes.

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Wrong token merge** (over-normalization) | Correctness — misstated holdings | Canonical-id ladder; keep bridged/wrapped distinct; flag low-confidence |
| **Under-normalization** (misses a real dupe) | UX — duplicate rows | Curated cross-chain map for majors |
| **API key leakage** | Security | Server-side proxy; env var only |
| **Provider outage / rate limits** | Availability | Per-wallet isolation, retries/timeouts, partial-failure UX |
| **Provider data quality** (missing prices, bad metadata, spam) | Correctness/UX | Spam flag, missing-price handling, low-confidence markers |
| **Grouping refactor debt** | Maintainability | Enforce flat-`Position[]` + pure `groupBy` invariant |
| **Float precision** in balance/value math | Correctness | `bigint` raw balances; careful decimal conversion |
| **Scope creep** into stretch goals | Delivery | Land core (F1–F8) first; stretch is phased |
| **Partial totals read as complete** | Trust | Explicitly annotate totals as partial when any wallet errored |

## Approach — Mock-First, Integration-Ready

Build against **mock data first**, then swap in the real provider and wallet-connect later
*without* refactoring the pipeline or UI. Two seams isolate the "real world":

**Seam 1 — Data source (mock ↔ Zerion).** One async interface both implement; chosen via env flag.

```ts
interface PortfolioSource {
  // per-wallet → failure isolation in both modes; throws on error so React Query
  // marks the query isError (FetchStatus is derived at the hook layer from query state)
  fetchWalletBalances(input: { address: string; chainIds: number[] }): Promise<RawBalance[]>;
}
// MockPortfolioSource  — fixture JSON, simulates latency + per-wallet failure
// ZerionPortfolioSource — calls server proxy; identical return shape
```

The mock returns the **same raw shape** the Zerion adapter will emit, and deliberately emits
edge cases (latency, a failing wallet, spam, cross-chain USDC, a symbol collision, a
no-coingecko-id token, a USDC.e distinct-but-adjacent case). Live mode still routes through
the server proxy (N1).

**Seam 2 — Address source (manual entry ↔ wallet-connect).** Wallets enter as a plain list;
how they got there is decoupled. Manual entry is the base; wallet-connect is an optional
provider that only supplies an address (balances still come from Seam 1, read-only).

```ts
type WalletInput = { address: string; label?: string; chainIds: number[] };
```

## Scope & Build Order

| Phase | Deliverable |
|-------|-------------|
| **1 — Core** | Manual wallet entry → `MockPortfolioSource` → normalize → aggregate → grouped view (token/network/wallet) → search → all loading/empty/partial/total-failure states (F1–F8) |
| **2 — Watchlist** | Star toggle, persisted `Set<canonicalId>`, watchlist filter view |
| **3 — Value over time** | Mocked `PortfolioSnapshot[]` → Recharts line chart |
| **4 — Tx history + pagination** | Per-wallet mock `Transaction[]` feed; paginate over groups |
| **5 — Live integration** | `ZerionPortfolioSource` + server proxy (env flag); wallet-connect (wagmi injected, later RainbowKit) |

### Resolved decisions

- **Identity policy:** bridged/wrapped stay **distinct, displayed adjacent** — never auto-merged.
- **Wallet input:** manual entry is the base; wallet-connect is additive (Phase 5).
- **Data:** mock-first behind `PortfolioSource`; live Zerion swaps in via env flag, through the server proxy.
- **Historical chart:** fully mocked `PortfolioSnapshot[]`.

### Open (safe defaults; confirm during build)

- **Spam policy:** default = hide provider-flagged `isSpam`, with a "show spam" toggle.
- **Refresh model:** default = manual refresh button (+ React Query cache); background interval optional later.

## Tech Stack

React + TypeScript (Vite) · TanStack Query (per-wallet fetching, loading/error/partial states) ·
Zustand (grouping key, search, watchlist) · Tailwind + Radix/shadcn (desktop tables, accessible
group/expand) · Recharts (stretch chart) · Zerion behind a server-side proxy (live phase).
