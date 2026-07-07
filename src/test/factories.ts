// Test-only builders. Not imported by app code, so never bundled.
import { normalizeOne } from '@/domain/normalize'
import type { Position, RawBalance } from '@/domain/types'

export function rawBalance(overrides: Partial<RawBalance> = {}): RawBalance {
  return {
    walletAddress: '0xWallet1',
    chainId: 1,
    contractAddress: null,
    symbol: 'TKN',
    name: 'Token',
    decimals: 18,
    rawBalance: '0',
    priceUsd: 1,
    ...overrides,
  }
}

/** Build a Position through the real normalize path so tests exercise production code. */
export function position(overrides: Partial<RawBalance> = {}): Position {
  return normalizeOne(rawBalance(overrides))
}
