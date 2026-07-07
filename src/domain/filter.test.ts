import { describe, it, expect } from 'vitest'
import { filterPositions, matchesSearch } from './filter'
import { position } from '@/test/factories'

const positions = [
  position({ symbol: 'USDC', name: 'USD Coin', walletAddress: '0xAlice' }),
  position({ symbol: 'WETH', name: 'Wrapped Ether', walletAddress: '0xBob' }),
]

describe('matchesSearch', () => {
  it('matches symbol, name, and wallet, case-insensitively', () => {
    expect(matchesSearch(positions[0], 'usdc')).toBe(true)
    expect(matchesSearch(positions[0], 'usd coin')).toBe(true)
    expect(matchesSearch(positions[0], '0xALICE')).toBe(true)
    expect(matchesSearch(positions[0], 'weth')).toBe(false)
  })

  it('empty query matches everything', () => {
    expect(matchesSearch(positions[1], '   ')).toBe(true)
  })
})

describe('filterPositions', () => {
  it('filters to matching positions', () => {
    expect(filterPositions(positions, 'weth').map((p) => p.token.symbol)).toEqual(['WETH'])
  })

  it('returns input unchanged for an empty query', () => {
    expect(filterPositions(positions, '')).toBe(positions)
  })
})
