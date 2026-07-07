// Canonical token identity — the correctness heart (F3, N4).
// Resolves a dedupe key via a layered fallback ladder so the same asset across chains
// collapses to one row, while distinct assets (symbol collisions, bridged/wrapped
// variants) never merge. Symbol alone is never sufficient.

import { CURATED_CANONICAL } from './curatedMap'
import type { IdentitySource, RawBalance } from './types'

export interface ResolvedIdentity {
  canonicalId: string
  identitySource: IdentitySource
}

function curatedKey(chainId: number, contractAddress: string | null): string {
  return `${chainId}:${contractAddress ? contractAddress.toLowerCase() : 'native'}`
}

/**
 * Resolve a token's canonical identity from the raw provider record.
 *
 * Ladder (by identity *confidence*): ① provider id → ② (chain, contract) → ③ curated → ④ symbol.
 * Runtime *order* places curated (③) before the bare-contract fallback (②): the curated map
 * exists precisely to override a per-chain contract key so majors without a provider id still
 * dedupe cross-chain. It is only consulted when no provider id exists, so higher-confidence
 * signals always win. `identitySource` records which rung matched (`'symbol'` ⇒ low confidence).
 */
export function resolveCanonicalId(raw: RawBalance): ResolvedIdentity {
  // ① Provider / coingecko asset id — best cross-chain identity.
  if (raw.providerAssetId) {
    return { canonicalId: raw.providerAssetId, identitySource: 'provider-id' }
  }

  // ③ Curated cross-chain map — unifies majors that lack a provider id.
  const curated = CURATED_CANONICAL[curatedKey(raw.chainId, raw.contractAddress)]
  if (curated) {
    return { canonicalId: curated, identitySource: 'curated' }
  }

  // ② Precise on-chain identity — unique per (chain, contract); does not dedupe cross-chain,
  //    which is correct: an unknown token on two chains is two unknowns until proven otherwise.
  if (raw.contractAddress) {
    return {
      canonicalId: `${raw.chainId}:${raw.contractAddress.toLowerCase()}`,
      identitySource: 'contract',
    }
  }

  // ④ Last resort — symbol + decimals. Flagged low-confidence via identitySource.
  return {
    canonicalId: `sym:${raw.symbol.toLowerCase()}:${raw.decimals}`,
    identitySource: 'symbol',
  }
}

/** True when identity rests only on the weakest rung (symbol + decimals). */
export function isLowConfidence(source: IdentitySource): boolean {
  return source === 'symbol'
}
