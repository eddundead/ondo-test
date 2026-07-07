import { describe, it, expect } from 'vitest'
import { resolveCanonicalId, isLowConfidence } from './identity'
import type { RawBalance } from './types'

// Minimal RawBalance builder — only the fields identity resolution reads matter here.
function raw(overrides: Partial<RawBalance>): RawBalance {
  return {
    walletAddress: '0xwallet',
    chainId: 1,
    contractAddress: null,
    symbol: 'TKN',
    name: 'Token',
    decimals: 18,
    rawBalance: '0',
    priceUsd: null,
    ...overrides,
  }
}

describe('resolveCanonicalId', () => {
  it('① prefers the provider/coingecko id and dedupes it across chains', () => {
    const eth = raw({ chainId: 1, providerAssetId: 'usd-coin' })
    const base = raw({ chainId: 8453, providerAssetId: 'usd-coin' })
    expect(resolveCanonicalId(eth)).toEqual({ canonicalId: 'usd-coin', identitySource: 'provider-id' })
    expect(resolveCanonicalId(base).canonicalId).toBe(resolveCanonicalId(eth).canonicalId)
  })

  it('③ curated map dedupes a major across chains when no provider id is present', () => {
    const usdcEth = raw({ chainId: 1, contractAddress: '0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48' })
    const usdcBase = raw({ chainId: 8453, contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' })
    const rEth = resolveCanonicalId(usdcEth)
    const rBase = resolveCanonicalId(usdcBase)
    expect(rEth).toEqual({ canonicalId: 'usd-coin', identitySource: 'curated' })
    expect(rBase.canonicalId).toBe(rEth.canonicalId) // deduped cross-chain
  })

  it('② falls back to (chain, contract) for an unknown token; different contracts stay distinct', () => {
    const a = raw({ chainId: 1, contractAddress: '0xAAA0000000000000000000000000000000000001' })
    const b = raw({ chainId: 1, contractAddress: '0xBBB0000000000000000000000000000000000002' })
    expect(resolveCanonicalId(a).identitySource).toBe('contract')
    expect(resolveCanonicalId(a).canonicalId).not.toBe(resolveCanonicalId(b).canonicalId)
  })

  it('does not merge a symbol collision — two different "UNI" tokens stay distinct', () => {
    const realUni = raw({ symbol: 'UNI', chainId: 1, contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' })
    const scamUni = raw({ symbol: 'UNI', chainId: 1, contractAddress: '0xdead000000000000000000000000000000000001' })
    expect(resolveCanonicalId(realUni).canonicalId).not.toBe(resolveCanonicalId(scamUni).canonicalId)
  })

  it('keeps bridged USDC.e distinct from native USDC (different provider id)', () => {
    const usdc = raw({ providerAssetId: 'usd-coin' })
    const usdcE = raw({ providerAssetId: 'usd-coin-e', symbol: 'USDC.e' })
    expect(resolveCanonicalId(usdc).canonicalId).not.toBe(resolveCanonicalId(usdcE).canonicalId)
  })

  it('keeps native ETH distinct from wrapped WETH', () => {
    const nativeEth = raw({ chainId: 1, contractAddress: null, symbol: 'ETH' })
    const weth = raw({ chainId: 1, contractAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH' })
    expect(resolveCanonicalId(nativeEth).canonicalId).toBe('ethereum')
    expect(resolveCanonicalId(weth).canonicalId).toBe('weth')
    expect(resolveCanonicalId(nativeEth).canonicalId).not.toBe(resolveCanonicalId(weth).canonicalId)
  })

  it('④ uses symbol+decimals as a last resort and flags it low-confidence', () => {
    // Native asset on a chain not in the curated map, with no provider id.
    const r = resolveCanonicalId(raw({ chainId: 999, contractAddress: null, symbol: 'FOO', decimals: 8 }))
    expect(r).toEqual({ canonicalId: 'sym:foo:8', identitySource: 'symbol' })
    expect(isLowConfidence(r.identitySource)).toBe(true)
  })

  it('is case-insensitive on contract address', () => {
    const lower = raw({ chainId: 1, contractAddress: '0xabc0000000000000000000000000000000000abc' })
    const upper = raw({ chainId: 1, contractAddress: '0xABC0000000000000000000000000000000000ABC' })
    expect(resolveCanonicalId(lower).canonicalId).toBe(resolveCanonicalId(upper).canonicalId)
  })

  it('isLowConfidence is true only for the symbol rung', () => {
    expect(isLowConfidence('provider-id')).toBe(false)
    expect(isLowConfidence('curated')).toBe(false)
    expect(isLowConfidence('contract')).toBe(false)
    expect(isLowConfidence('symbol')).toBe(true)
  })
})
