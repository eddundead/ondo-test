// Per-wallet React Query — the unit of failure isolation. One query per wallet means a
// failed wallet never blocks a succeeded one (N3). usePortfolio fans these out via useQueries.

import { queryOptions, useQuery } from '@tanstack/react-query'
import { getPortfolioSource } from '@/data/source'
import type { WalletInput } from '@/domain/types'

// Seam 1 implementation, selected once from the env flag.
const source = getPortfolioSource()

/** Typed query options for one wallet — shared by useWalletBalances and useQueries. */
export function walletBalancesQueryOptions(wallet: WalletInput) {
  return queryOptions({
    queryKey: ['wallet-balances', wallet.address.toLowerCase(), wallet.chainIds] as const,
    queryFn: () => source.fetchWalletBalances({ address: wallet.address, chainIds: wallet.chainIds }),
  })
}

/** Single-wallet convenience hook (the fan-out in usePortfolio uses the options builder). */
export function useWalletBalances(wallet: WalletInput) {
  return useQuery(walletBalancesQueryOptions(wallet))
}
