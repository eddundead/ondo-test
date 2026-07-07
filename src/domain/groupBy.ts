// Grouping: pure transform over Position[] (F5, N2).
// Selecting a GroupKey swaps an accessor — no structural change, no refetch. This is the
// invariant that keeps regrouping refactor-free.

import type { GroupKey, Position } from './types'

export interface PositionGroup {
  key: string // accessor value: canonicalId | String(chainId) | walletAddress
  positions: Position[]
  totalValueUsd: number
}

/** One accessor per grouping mode — the whole difference between the three views. */
export const groupAccessors: Record<GroupKey, (p: Position) => string> = {
  token: (p) => p.token.canonicalId,
  network: (p) => String(p.chainId),
  wallet: (p) => p.walletAddress,
}

/** Group positions by the chosen key. Groups sorted by value desc; input never mutated. */
export function groupBy(positions: Position[], key: GroupKey): PositionGroup[] {
  const accessor = groupAccessors[key]
  const byKey = new Map<string, Position[]>()
  for (const p of positions) {
    const k = accessor(p)
    const bucket = byKey.get(k)
    if (bucket) bucket.push(p)
    else byKey.set(k, [p])
  }

  const groups: PositionGroup[] = []
  for (const [k, group] of byKey) {
    groups.push({
      key: k,
      positions: group,
      totalValueUsd: group.reduce((s, p) => s + p.valueUsd, 0),
    })
  }
  groups.sort((a, b) => b.totalValueUsd - a.totalValueUsd)
  return groups
}
