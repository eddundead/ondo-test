// Grouped view model: compose groupBy + aggregate into what the UI renders (F5).
// Each group (by token/network/wallet) carries its positions rolled up into per-asset rows.
// Pure — the hook memoizes it; the UI just renders it.

import { aggregate } from './aggregate'
import { groupBy } from './groupBy'
import type { AggregatedAsset, GroupKey, Position } from './types'

export interface GroupView {
  key: string // accessor value: canonicalId | String(chainId) | walletAddress
  positions: Position[]
  totalValueUsd: number
  assets: AggregatedAsset[] // this group's positions, rolled up by canonical asset
}

/** Group positions by `key`, then aggregate within each group. Groups sorted by value desc. */
export function buildGroupedView(positions: Position[], key: GroupKey): GroupView[] {
  return groupBy(positions, key).map((g) => ({
    key: g.key,
    positions: g.positions,
    totalValueUsd: g.totalValueUsd,
    assets: aggregate(g.positions).assets,
  }))
}
