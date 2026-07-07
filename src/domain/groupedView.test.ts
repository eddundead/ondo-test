import { describe, it, expect } from 'vitest'
import { buildGroupedView } from './groupedView'
import { position } from '@/test/factories'

const positions = [
  position({ chainId: 1, walletAddress: '0xA', providerAssetId: 'usd-coin', symbol: 'USDC', decimals: 6, rawBalance: '2000000', priceUsd: 1 }),
  position({ chainId: 8453, walletAddress: '0xA', providerAssetId: 'usd-coin', symbol: 'USDC', decimals: 6, rawBalance: '1000000', priceUsd: 1 }),
  position({ chainId: 1, walletAddress: '0xB', providerAssetId: 'weth', symbol: 'WETH', decimals: 18, rawBalance: '1000000000000000000', priceUsd: 5 }),
]

describe('buildGroupedView', () => {
  it('by token: one group per canonical asset, each rolled up to a single asset row', () => {
    const view = buildGroupedView(positions, 'token')
    expect(view.map((g) => g.key)).toEqual(['weth', 'usd-coin'])
    const usdc = view.find((g) => g.key === 'usd-coin')!
    expect(usdc.assets).toHaveLength(1)
    expect(usdc.assets[0].totalBalance).toBeCloseTo(3)
    expect(usdc.assets[0].chainCount).toBe(2)
  })

  it('by network: positions on a chain roll up per asset', () => {
    const view = buildGroupedView(positions, 'network')
    const eth = view.find((g) => g.key === '1')!
    expect(eth.assets.map((a) => a.canonicalId).sort()).toEqual(['usd-coin', 'weth'])
    expect(eth.totalValueUsd).toBeCloseTo(7)
  })

  it('by wallet: groups by holder', () => {
    const view = buildGroupedView(positions, 'wallet')
    expect(view.find((g) => g.key === '0xA')!.assets).toHaveLength(1) // USDC only
    expect(view.find((g) => g.key === '0xB')!.assets).toHaveLength(1) // WETH only
  })
})
