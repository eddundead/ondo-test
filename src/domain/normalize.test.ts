import { describe, it, expect } from 'vitest'
import { normalize, normalizeOne, toDecimal } from './normalize'
import { rawBalance } from '@/test/factories'

describe('toDecimal', () => {
  it('converts on-chain integers by decimals', () => {
    expect(toDecimal(1_500_000n, 6)).toBeCloseTo(1.5)
    expect(toDecimal(1_000_000_000_000_000_000n, 18)).toBeCloseTo(1)
    expect(toDecimal(5n, 0)).toBe(5)
  })

  it('keeps precision on large balances', () => {
    // 1234.5 tokens at 18 decimals — Number(raw)/1e18 would be lossy; split avoids it.
    expect(toDecimal(1234_500000000000000000n, 18)).toBeCloseTo(1234.5, 6)
  })
})

describe('normalizeOne', () => {
  it('computes balance, value, and a stable id; attaches identity', () => {
    const p = normalizeOne(
      rawBalance({ symbol: 'USDC', decimals: 6, rawBalance: '2500000', priceUsd: 1, providerAssetId: 'usd-coin' }),
    )
    expect(p.balance).toBeCloseTo(2.5)
    expect(p.valueUsd).toBeCloseTo(2.5)
    expect(p.token.canonicalId).toBe('usd-coin')
    expect(p.id).toBe('0xwallet1:1:native')
  })

  it('treats a missing price as zero value', () => {
    const p = normalizeOne(rawBalance({ rawBalance: '1000000000000000000', priceUsd: null }))
    expect(p.priceUsd).toBe(0)
    expect(p.valueUsd).toBe(0)
  })

  it('lowercases wallet and contract in the id so re-entry cannot duplicate', () => {
    const a = normalizeOne(rawBalance({ walletAddress: '0xABC', contractAddress: '0xDEF0000000000000000000000000000000000001' }))
    const b = normalizeOne(rawBalance({ walletAddress: '0xabc', contractAddress: '0xdef0000000000000000000000000000000000001' }))
    expect(a.id).toBe(b.id)
  })
})

describe('normalize', () => {
  it('maps a batch preserving order', () => {
    const out = normalize([rawBalance({ symbol: 'A' }), rawBalance({ symbol: 'B' })])
    expect(out.map((p) => p.token.symbol)).toEqual(['A', 'B'])
  })
})
