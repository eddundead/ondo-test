// Normalization: RawBalance[] → Position[] (F3 wiring, part of the pipeline).
// Resolves canonical identity, converts the on-chain integer to a display balance with
// bigint precision, and attaches price/value. Pure — no I/O, deterministic.

import { resolveCanonicalId } from './identity'
import type { Position, RawBalance, TokenIdentity } from './types'

/**
 * Convert an on-chain integer amount to a decimal number without the precision loss of
 * `Number(raw) / 10 ** decimals` on large values: divide the bigint, keep the remainder
 * as a fraction. Good enough for display; `rawBalance` stays the source of truth.
 */
export function toDecimal(raw: bigint, decimals: number): number {
  if (decimals <= 0) return Number(raw)
  const divisor = 10n ** BigInt(decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  return Number(whole) + Number(frac) / Number(divisor)
}

function toTokenIdentity(raw: RawBalance): TokenIdentity {
  const { canonicalId, identitySource } = resolveCanonicalId(raw)
  return {
    canonicalId,
    identitySource,
    symbol: raw.symbol,
    name: raw.name,
    decimals: raw.decimals,
    logoUrl: raw.logoUrl,
    isSpam: raw.isSpam ?? false,
  }
}

/** Stable per-(wallet, chain, token) key. Case-normalized so re-entry can't duplicate. */
function positionId(raw: RawBalance): string {
  const token = raw.contractAddress ? raw.contractAddress.toLowerCase() : 'native'
  return `${raw.walletAddress.toLowerCase()}:${raw.chainId}:${token}`
}

/** Normalize one raw balance into a Position. */
export function normalizeOne(raw: RawBalance): Position {
  const token = toTokenIdentity(raw)
  const rawBalance = BigInt(raw.rawBalance)
  const balance = toDecimal(rawBalance, raw.decimals)
  const priceUsd = raw.priceUsd ?? 0 // no price ⇒ contributes 0 value (documented edge case)
  return {
    id: positionId(raw),
    token,
    chainId: raw.chainId,
    walletAddress: raw.walletAddress,
    rawBalance,
    balance,
    priceUsd,
    valueUsd: balance * priceUsd,
  }
}

/** Normalize a batch of raw balances into the flat Position[] source of truth. */
export function normalize(raws: RawBalance[]): Position[] {
  return raws.map(normalizeOne)
}
