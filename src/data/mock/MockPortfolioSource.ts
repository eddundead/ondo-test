// Mock implementation of Seam 1. Reads fixtures, simulates network latency, and fails the
// designated wallet by throwing — so the per-wallet query surfaces a real error and the
// partial-failure UX is exercised end-to-end without any live provider.

import type { FetchWalletInput, PortfolioSource } from '@/data/PortfolioSource'
import type { RawBalance } from '@/domain/types'
import { FAILING_WALLET, MOCK_BALANCES } from './fixtures'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface MockOptions {
  /** Fixed latency in ms. Omit for a small randomized delay; pass 0 in tests. */
  latencyMs?: number
}

export class MockPortfolioSource implements PortfolioSource {
  constructor(private readonly options: MockOptions = {}) {}

  async fetchWalletBalances({ address, chainIds }: FetchWalletInput): Promise<RawBalance[]> {
    await delay(this.options.latencyMs ?? 150 + Math.random() * 250)

    const key = address.toLowerCase()
    if (key === FAILING_WALLET.toLowerCase()) {
      throw new Error(`Provider request timed out for ${address}`)
    }

    const all = MOCK_BALANCES[key] ?? [] // unknown wallet ⇒ empty, funded-nothing (a success)
    return all.filter((b) => chainIds.includes(b.chainId))
  }
}
