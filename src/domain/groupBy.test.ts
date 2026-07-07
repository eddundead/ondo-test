import { describe, it, expect } from 'vitest'
import { groupBy } from './groupBy'
import { position } from '@/test/factories'

// Same three positions, regrouped three ways — proves a key swap re-derives the view.
const positions = [
  position({ chainId: 1, walletAddress: '0xA', providerAssetId: 'usd-coin', symbol: 'USDC', decimals: 6, rawBalance: '2000000', priceUsd: 1 }), // $2
  position({ chainId: 8453, walletAddress: '0xA', providerAssetId: 'usd-coin', symbol: 'USDC', decimals: 6, rawBalance: '1000000', priceUsd: 1 }), // $1
  position({ chainId: 1, walletAddress: '0xB', providerAssetId: 'weth', symbol: 'WETH', decimals: 18, rawBalance: '1000000000000000000', priceUsd: 5 }), // $5
]

describe('groupBy', () => {
  it('groups by token (canonicalId)', () => {
    const groups = groupBy(positions, 'token')
    expect(groups.map((g) => g.key)).toEqual(['weth', 'usd-coin']) // sorted by value desc
    expect(groups.find((g) => g.key === 'usd-coin')?.positions).toHaveLength(2)
  })

  it('groups by network (chainId)', () => {
    const groups = groupBy(positions, 'network')
    const eth = groups.find((g) => g.key === '1')
    expect(eth?.positions).toHaveLength(2) // USDC + WETH on chain 1
    expect(eth?.totalValueUsd).toBeCloseTo(7)
  })

  it('groups by wallet', () => {
    const groups = groupBy(positions, 'wallet')
    expect(groups.find((g) => g.key === '0xA')?.positions).toHaveLength(2)
    expect(groups.find((g) => g.key === '0xB')?.positions).toHaveLength(1)
  })

  it('does not mutate the input', () => {
    const before = positions.length
    groupBy(positions, 'token')
    expect(positions).toHaveLength(before)
  })
})
