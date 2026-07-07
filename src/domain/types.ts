// Domain vocabulary shared by every layer. Pure types, zero runtime.
// See CLAUDE.md (glossary + invariants) and ARCHITECTURE.md (pipeline) for context.

/** How a token's canonical identity was resolved — the ladder rung that matched. */
export type IdentitySource =
  | 'provider-id' // ① coingecko / provider asset id  (best cross-chain identity)
  | 'contract' //    ② (chainId, contractAddress)     (precise on-chain identity)
  | 'curated' //     ③ hand-maintained cross-chain map (majors)
  | 'symbol' //      ④ symbol + decimals              (last resort → low confidence)

/** Canonical identity + display metadata for one asset. `canonicalId` is the dedupe key. */
export interface TokenIdentity {
  /** Cross-chain identity (coingecko id or synthetic). Same asset on N chains → one id. */
  canonicalId: string
  /** Which ladder rung produced `canonicalId`. `'symbol'` ⇒ low-confidence. */
  identitySource: IdentitySource
  symbol: string // display only — never a dedupe key on its own
  name: string
  decimals: number // used for balance math
  logoUrl?: string
  isSpam: boolean // provider-flagged; drives the spam filter
}

/**
 * Provider-shaped balance record, pre-normalization — the Seam 1 output.
 * Identical between MockPortfolioSource and ZerionPortfolioSource so the
 * normalize step is written once. `rawBalance` is an integer STRING because
 * JSON has no bigint; normalize() converts it to bigint.
 */
export interface RawBalance {
  walletAddress: string
  chainId: number
  /** Token contract; `null` for a native asset (ETH, MATIC, …). */
  contractAddress: string | null
  symbol: string
  name: string
  decimals: number
  rawBalance: string // on-chain integer amount, as a string
  priceUsd: number | null // null when the provider has no price
  logoUrl?: string
  isSpam?: boolean
  /** Provider/coingecko asset id when available → ladder rung ①. */
  providerAssetId?: string | null
}

/** Atomic unit: one token, one wallet, one chain. */
export interface Position {
  /** Stable key `${walletAddress}:${chainId}:${contractAddress ?? 'native'}`. */
  id: string
  token: TokenIdentity
  chainId: number
  walletAddress: string
  rawBalance: bigint // on-chain integer amount (truth)
  balance: number // rawBalance / 10^decimals
  priceUsd: number
  valueUsd: number // balance × priceUsd
}

/** Cross-chain / cross-wallet rollup of one canonical asset. */
export interface AggregatedAsset {
  canonicalId: string
  token: TokenIdentity
  totalBalance: number // summed across chains/wallets
  totalValueUsd: number
  positions: Position[] // breakdown: which chains/wallets hold it
  chainCount: number // distinct chains, e.g. "on 3 networks"
}

/** Per-wallet fetch result — drives the partial-failure UX. */
export interface FetchStatus {
  walletAddress: string
  status: 'success' | 'error' | 'loading'
  error?: string // message for the failure banner
  positionsCount: number
}

/** How a wallet enters the app — decoupled from *how* it got there (Seam 2). */
export interface WalletInput {
  address: string
  label?: string // display alias / ENS
  chainIds: number[]
}

/** The three grouping modes. Selecting one swaps a pure `groupBy` accessor — no refetch. */
export type GroupKey = 'token' | 'network' | 'wallet'

// ── Stretch (Phases 3–4) — declared here so the data model is complete in one place ──

/** One transaction (stretch: transaction history). */
export interface Transaction {
  hash: string
  chainId: number
  walletAddress: string
  type: 'send' | 'receive' | 'swap' | 'approve' | string
  tokenSymbol: string
  amount: number
  valueUsd: number
  timestamp: number
}

/** One point on the portfolio-value-over-time line (stretch: mocked history). */
export interface PortfolioSnapshot {
  timestamp: number
  totalValueUsd: number
}
