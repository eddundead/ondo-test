import { describe, it, expect } from 'vitest'
import { MockPortfolioSource } from './MockPortfolioSource'
import { ALICE, EMPTY_WALLET, FAILING_WALLET } from './fixtures'

const source = new MockPortfolioSource({ latencyMs: 0 })

describe('MockPortfolioSource', () => {
  it('returns a wallet’s balances filtered to the requested chains', async () => {
    const only1 = await source.fetchWalletBalances({ address: ALICE, chainIds: [1] })
    expect(only1.length).toBeGreaterThan(0)
    expect(only1.every((b) => b.chainId === 1)).toBe(true)

    const multi = await source.fetchWalletBalances({ address: ALICE, chainIds: [1, 8453, 42161] })
    expect(multi.length).toBeGreaterThan(only1.length)
  })

  it('is case-insensitive on the address', async () => {
    const lower = await source.fetchWalletBalances({ address: ALICE.toLowerCase(), chainIds: [1] })
    const mixed = await source.fetchWalletBalances({ address: ALICE, chainIds: [1] })
    expect(lower).toEqual(mixed)
  })

  it('returns empty for a known-empty or unknown wallet', async () => {
    expect(await source.fetchWalletBalances({ address: EMPTY_WALLET, chainIds: [1] })).toEqual([])
    expect(await source.fetchWalletBalances({ address: '0xUnknown', chainIds: [1] })).toEqual([])
  })

  it('throws for the failing wallet (drives partial-failure UX)', async () => {
    await expect(source.fetchWalletBalances({ address: FAILING_WALLET, chainIds: [1] })).rejects.toThrow(/timed out/i)
  })
})
