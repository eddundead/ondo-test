// Hand-maintained cross-chain identity map for majors (ladder rung ③).
// Purpose: when a provider/coingecko id is absent, still dedupe the same asset across
// chains — a bare (chain, contract) key never could, since each chain has a distinct
// deployment address. Keep this small and high-confidence; it is a safety net, not a
// registry. Key format: `${chainId}:${contractAddressLowercase | 'native'}`.

// Chain ids referenced below: 1 Ethereum · 10 Optimism · 137 Polygon · 8453 Base · 42161 Arbitrum.
export const CURATED_CANONICAL: Record<string, string> = {
  // USDC (native deployments) → one canonical asset across chains
  '1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'usd-coin',
  '8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'usd-coin',
  '42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'usd-coin',

  // USDT
  '1:0xdac17f958d2ee523a2206206994597c13d831ec7': 'tether',
  '42161:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'tether',

  // Native ETH across L2s — deliberately distinct from WETH below
  '1:native': 'ethereum',
  '8453:native': 'ethereum',
  '42161:native': 'ethereum',
  '10:native': 'ethereum',

  // WETH — a different-risk wrapped asset; must NOT collapse into native ETH
  '1:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'weth',
  '8453:0x4200000000000000000000000000000000000006': 'weth',
}
