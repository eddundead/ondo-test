// Mock dataset. Every entry is chosen to exercise a specific edge case from REQUIREMENTS.md —
// the fixture quality IS the demo. Keyed by lowercased wallet address → raw provider balances.
// `rawBalance` is an integer string (JSON/provider reality); normalize() turns it into bigint.

import type { RawBalance, WalletInput } from '@/domain/types'

// Fake but well-formed addresses.
export const ALICE = '0xA11ce00000000000000000000000000000000001'
export const BOB = '0xB0b0000000000000000000000000000000000002'
export const FAILING_WALLET = '0xFa11000000000000000000000000000000000000'
export const EMPTY_WALLET = '0xE0000000000000000000000000000000000000005'

// Real major-token contracts so the curated map (ladder rung ③) is genuinely exercised.
const USDC_ETH = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
const USDT_ETH = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const WETH_ETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const UNI_ETH = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'
const USDCE_ARB = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8' // bridged USDC.e — deliberately NOT curated

function bal(o: Partial<RawBalance> & Pick<RawBalance, 'walletAddress' | 'chainId' | 'symbol' | 'decimals' | 'rawBalance'>): RawBalance {
  return { contractAddress: null, name: o.symbol, priceUsd: null, ...o }
}

const ALICE_BALANCES: RawBalance[] = [
  // Native ETH — dedupes cross-chain/wallet with Bob's ETH via provider id.
  bal({ walletAddress: ALICE, chainId: 1, symbol: 'ETH', name: 'Ethereum', decimals: 18, rawBalance: '1500000000000000000', priceUsd: 3200, providerAssetId: 'ethereum' }),
  // Cross-chain USDC (Ethereum + Base) with provider id → dedupes with each other and Bob's USDC.
  bal({ walletAddress: ALICE, chainId: 1, contractAddress: USDC_ETH, symbol: 'USDC', name: 'USD Coin', decimals: 6, rawBalance: '5000000000', priceUsd: 1, providerAssetId: 'usd-coin' }),
  bal({ walletAddress: ALICE, chainId: 8453, contractAddress: USDC_BASE, symbol: 'USDC', name: 'USD Coin', decimals: 6, rawBalance: '2500000000', priceUsd: 1, providerAssetId: 'usd-coin' }),
  // WETH — must stay DISTINCT from native ETH (different canonical asset, different risk).
  bal({ walletAddress: ALICE, chainId: 1, contractAddress: WETH_ETH, symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, rawBalance: '800000000000000000', priceUsd: 3200, providerAssetId: 'weth' }),
  // Bridged USDC.e — no provider id, not curated → resolves by contract, stays DISTINCT from USDC.
  bal({ walletAddress: ALICE, chainId: 42161, contractAddress: USDCE_ARB, symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6, rawBalance: '1200000000', priceUsd: 1 }),
  // Spam token — provider-flagged; filtered by default in the UI.
  bal({ walletAddress: ALICE, chainId: 1, contractAddress: '0x5pam000000000000000000000000000000000001', symbol: 'CLAIM-AIRDROP.COM', name: 'Visit to claim', decimals: 18, rawBalance: '1000000000000000000000000', priceUsd: 0, isSpam: true }),
]

const BOB_BALANCES: RawBalance[] = [
  // USDC on Base WITHOUT a provider id — the curated map still dedupes it with Alice's USDC.
  bal({ walletAddress: BOB, chainId: 8453, contractAddress: USDC_BASE, symbol: 'USDC', name: 'USD Coin', decimals: 6, rawBalance: '8000000000', priceUsd: 1 }),
  bal({ walletAddress: BOB, chainId: 1, contractAddress: USDT_ETH, symbol: 'USDT', name: 'Tether USD', decimals: 6, rawBalance: '3000000000', priceUsd: 1, providerAssetId: 'tether' }),
  // Real Uniswap UNI.
  bal({ walletAddress: BOB, chainId: 1, contractAddress: UNI_ETH, symbol: 'UNI', name: 'Uniswap', decimals: 18, rawBalance: '150000000000000000000', priceUsd: 7.5, providerAssetId: 'uniswap' }),
  // Symbol collision — a different token also called "UNI"; must NOT merge with the real one.
  bal({ walletAddress: BOB, chainId: 1, contractAddress: '0xdead000000000000000000000000000000000001', symbol: 'UNI', name: 'Unicorn Rewards', decimals: 18, rawBalance: '999000000000000000000', priceUsd: 0.01 }),
  // No provider id + no price — resolves by contract, contributes 0 value (documented edge case).
  bal({ walletAddress: BOB, chainId: 42161, contractAddress: '0xf00d000000000000000000000000000000000002', symbol: 'FOO', name: 'Foo Protocol', decimals: 18, rawBalance: '42000000000000000000', priceUsd: null }),
  // Native ETH on Arbitrum — dedupes with Alice's mainnet ETH (cross-chain, cross-wallet).
  bal({ walletAddress: BOB, chainId: 42161, symbol: 'ETH', name: 'Ethereum', decimals: 18, rawBalance: '300000000000000000', priceUsd: 3200, providerAssetId: 'ethereum' }),
]

/** Wallet address (lowercased) → its raw balances. Missing wallet ⇒ empty (a valid, funded-nothing wallet). */
export const MOCK_BALANCES: Record<string, RawBalance[]> = {
  [ALICE.toLowerCase()]: ALICE_BALANCES,
  [BOB.toLowerCase()]: BOB_BALANCES,
  [EMPTY_WALLET.toLowerCase()]: [],
}

/** Seed for the "load sample portfolio" button — includes a failing and an empty wallet on purpose. */
export const SAMPLE_WALLETS: WalletInput[] = [
  { address: ALICE, label: 'alice.eth', chainIds: [1, 8453, 42161] },
  { address: BOB, label: 'bob.eth', chainIds: [1, 8453, 42161] },
  { address: FAILING_WALLET, label: 'Cold Storage', chainIds: [1] }, // always fails → partial-failure banner
  { address: EMPTY_WALLET, label: 'Empty Vault', chainIds: [1] }, // succeeds with zero positions
]
