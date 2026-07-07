// Search/filter over Position[] (F6). Applied before grouping. Pure.

import type { Position } from './types'

/** True if the position matches the query (symbol / name / wallet address, case-insensitive). */
export function matchesSearch(p: Position, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    p.token.symbol.toLowerCase().includes(q) ||
    p.token.name.toLowerCase().includes(q) ||
    p.walletAddress.toLowerCase().includes(q)
  )
}

/** Filter positions by search query. Empty query returns the input unchanged. */
export function filterPositions(positions: Position[], query: string): Position[] {
  if (!query.trim()) return positions
  return positions.filter((p) => matchesSearch(p, query))
}
