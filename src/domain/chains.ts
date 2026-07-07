// Chain reference data for display (network grouping headers, chain badges).

export interface ChainMeta {
  id: number
  name: string
  short: string
}

export const CHAINS: Record<number, ChainMeta> = {
  1: { id: 1, name: 'Ethereum', short: 'ETH' },
  10: { id: 10, name: 'Optimism', short: 'OP' },
  137: { id: 137, name: 'Polygon', short: 'POLY' },
  8453: { id: 8453, name: 'Base', short: 'BASE' },
  42161: { id: 42161, name: 'Arbitrum', short: 'ARB' },
}

export function chainName(id: number): string {
  return CHAINS[id]?.name ?? `Chain ${id}`
}

export function chainShort(id: number): string {
  return CHAINS[id]?.short ?? String(id)
}
