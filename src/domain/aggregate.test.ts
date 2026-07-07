import { describe, it, expect } from 'vitest'
import { aggregate } from './aggregate'
import { position } from '@/test/factories'

describe('aggregate', () => {
  it('collapses the same canonical asset across chains and wallets', () => {
    const positions = [
      position({ chainId: 1, walletAddress: '0xA', providerAssetId: 'usd-coin', symbol: 'USDC', decimals: 6, rawBalance: '1000000', priceUsd: 1 }),
      position({ chainId: 8453, walletAddress: '0xA', providerAssetId: 'usd-coin', symbol: 'USDC', decimals: 6, rawBalance: '3000000', priceUsd: 1 }),
      position({ chainId: 42161, walletAddress: '0xB', providerAssetId: 'usd-coin', symbol: 'USDC', decimals: 6, rawBalance: '1000000', priceUsd: 1 }),
    ]
    const { assets, totalValueUsd } = aggregate(positions)
    expect(assets).toHaveLength(1)
    expect(assets[0].totalBalance).toBeCloseTo(5)
    expect(assets[0].totalValueUsd).toBeCloseTo(5)
    expect(assets[0].chainCount).toBe(3)
    expect(assets[0].positions).toHaveLength(3)
    expect(totalValueUsd).toBeCloseTo(5)
  })

  it('keeps distinct assets separate and sorts by value desc', () => {
    const { assets } = aggregate([
      position({ providerAssetId: 'a', symbol: 'A', priceUsd: 2, rawBalance: '1000000000000000000', decimals: 18 }), // $2
      position({ providerAssetId: 'b', symbol: 'B', priceUsd: 10, rawBalance: '1000000000000000000', decimals: 18 }), // $10
    ])
    expect(assets.map((a) => a.canonicalId)).toEqual(['b', 'a'])
  })

  it('is empty for no positions', () => {
    expect(aggregate([])).toEqual({ assets: [], totalValueUsd: 0 })
  })
})
