import { describe, it, expect } from 'vitest'
import { aggregate } from '@/domain/aggregate'
import { normalize } from '@/domain/normalize'
import { ALICE, BOB, MOCK_BALANCES } from './fixtures'

// Feed the fixtures through the real pipeline to prove they exercise the intended edge cases.
const positions = normalize([...MOCK_BALANCES[ALICE.toLowerCase()], ...MOCK_BALANCES[BOB.toLowerCase()]])
const { assets } = aggregate(positions)
const byId = (id: string) => assets.find((a) => a.canonicalId === id)

describe('fixtures → pipeline', () => {
  it('dedupes USDC across chains and wallets (provider id + curated fallback)', () => {
    const usdc = byId('usd-coin')
    expect(usdc).toBeDefined()
    expect(usdc!.totalBalance).toBeCloseTo(15500) // 5000 + 2500 (Alice) + 8000 (Bob, curated)
    expect(usdc!.chainCount).toBe(2) // Ethereum + Base
    expect(usdc!.positions).toHaveLength(3)
  })

  it('dedupes native ETH cross-chain and cross-wallet', () => {
    const eth = byId('ethereum')
    expect(eth!.totalBalance).toBeCloseTo(1.8) // 1.5 (Alice/ETH) + 0.3 (Bob/Arbitrum)
    expect(eth!.chainCount).toBe(2)
  })

  it('keeps native ETH and wrapped WETH as separate assets', () => {
    expect(byId('ethereum')).toBeDefined()
    expect(byId('weth')).toBeDefined()
    expect(byId('ethereum')!.canonicalId).not.toBe(byId('weth')!.canonicalId)
  })

  it('does not merge the two "UNI" tokens (symbol collision)', () => {
    const unis = assets.filter((a) => a.token.symbol === 'UNI')
    expect(unis).toHaveLength(2)
  })

  it('keeps bridged USDC.e distinct from USDC', () => {
    const usdce = assets.find((a) => a.token.symbol === 'USDC.e')
    expect(usdce).toBeDefined()
    expect(usdce!.canonicalId).not.toBe('usd-coin')
  })

  it('gives a priceless token zero value', () => {
    const foo = assets.find((a) => a.token.symbol === 'FOO')
    expect(foo!.totalValueUsd).toBe(0)
  })

  it('retains spam tokens at the domain level (filtering is a UI concern)', () => {
    expect(positions.some((p) => p.token.isSpam)).toBe(true)
  })
})
