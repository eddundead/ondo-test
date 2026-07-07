// Injection point for Seam 1 — selects the PortfolioSource implementation from the
// VITE_DATA_SOURCE env flag. Phase 5 adds the `zerion` branch; hooks depend on the
// interface, never on a concrete class.

import type { PortfolioSource } from './PortfolioSource'
import { MockPortfolioSource } from './mock/MockPortfolioSource'

export function getPortfolioSource(): PortfolioSource {
  const kind = import.meta.env.VITE_DATA_SOURCE ?? 'mock'
  switch (kind) {
    // case 'zerion': return new ZerionPortfolioSource()   // Phase 5
    case 'mock':
    default:
      return new MockPortfolioSource()
  }
}
