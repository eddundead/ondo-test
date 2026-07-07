// Aggregation: Position[] → AggregatedAsset[] + portfolio total (F4).
// Collapses same-canonicalId positions across chains/wallets. Pure.

import type { AggregatedAsset, Position } from './types'

export interface AggregationResult {
  assets: AggregatedAsset[] // sorted by total value, desc
  totalValueUsd: number
}

/** Roll up positions by canonical identity; sum balances and value; count distinct chains. */
export function aggregate(positions: Position[]): AggregationResult {
  const byCanonical = new Map<string, Position[]>()
  for (const p of positions) {
    const bucket = byCanonical.get(p.token.canonicalId)
    if (bucket) bucket.push(p)
    else byCanonical.set(p.token.canonicalId, [p])
  }

  const assets: AggregatedAsset[] = []
  for (const [canonicalId, group] of byCanonical) {
    const sorted = [...group].sort((a, b) => b.valueUsd - a.valueUsd)
    assets.push({
      canonicalId,
      token: sorted[0].token, // shared identity across the group
      totalBalance: sorted.reduce((s, p) => s + p.balance, 0),
      totalValueUsd: sorted.reduce((s, p) => s + p.valueUsd, 0),
      positions: sorted,
      chainCount: new Set(sorted.map((p) => p.chainId)).size,
    })
  }

  assets.sort((a, b) => b.totalValueUsd - a.totalValueUsd)
  const totalValueUsd = assets.reduce((s, a) => s + a.totalValueUsd, 0)
  return { assets, totalValueUsd }
}
