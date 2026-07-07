// Seam 1 — the single interface both the mock and the live Zerion adapter implement.
// The app depends only on this; going live is writing ZerionPortfolioSource + flipping
// the VITE_DATA_SOURCE flag (see source.ts). Nothing downstream knows which impl is active.

import type { RawBalance } from '@/domain/types'

export interface FetchWalletInput {
  address: string
  chainIds: number[]
}

/**
 * Fetch one wallet's raw balances across the requested chains.
 *
 * Failure model: **throws** on fetch failure so the per-wallet React Query (T6) marks that
 * query `isError` — retries and failure isolation come from React Query. The per-wallet
 * `FetchStatus` used by the partial-failure UX is derived from query state at the hook layer,
 * not returned here (a refinement over the original `{ raw, status }` shape — same information,
 * proper retry semantics).
 */
export interface PortfolioSource {
  fetchWalletBalances(input: FetchWalletInput): Promise<RawBalance[]>
}
