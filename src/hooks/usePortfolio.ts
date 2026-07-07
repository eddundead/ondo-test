// Orchestration hub (Wave 2). Fans out one query per wallet, derives per-wallet FetchStatus,
// reduces those into a single aggregate UX state, and exposes the grouped/filtered view.
// This is where async data (React Query) meets view state (Zustand) and the pure domain layer.

import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { aggregate } from '@/domain/aggregate'
import { filterPositions } from '@/domain/filter'
import { buildGroupedView, type GroupView } from '@/domain/groupedView'
import { normalize } from '@/domain/normalize'
import type { FetchStatus, GroupKey } from '@/domain/types'
import { useUiStore } from '@/store/uiStore'
import { walletBalancesQueryOptions } from './useWalletBalances'

export type PortfolioUiState = 'idle' | 'loading' | 'empty' | 'loaded' | 'partial' | 'error'

export interface PortfolioData {
  uiState: PortfolioUiState
  statuses: FetchStatus[]
  walletCount: number
  successCount: number
  failedCount: number
  loadingCount: number
  /** Some wallets failed while others succeeded — totals are incomplete. */
  isPartial: boolean
  totalValueUsd: number
  assetCount: number
  groupKey: GroupKey
  view: GroupView[]
  isFetching: boolean
  /** Retry only the failed wallets (banner action). */
  retryFailed: () => void
  /** Refetch everything (manual refresh). */
  refetchAll: () => void
}

export function usePortfolio(): PortfolioData {
  const wallets = useUiStore((s) => s.wallets)
  const groupKey = useUiStore((s) => s.groupKey)
  const search = useUiStore((s) => s.search)
  const showSpam = useUiStore((s) => s.showSpam)

  // Fan-out: one independent query per wallet (results align with `wallets` by index).
  const results = useQueries({
    queries: wallets.map((w) => walletBalancesQueryOptions(w)),
  })

  // Per-wallet status — the raw material for the partial-failure UX.
  const statuses: FetchStatus[] = wallets.map((w, i) => {
    const r = results[i]
    if (r?.isError) {
      return { walletAddress: w.address, status: 'error', error: (r.error as Error).message, positionsCount: 0 }
    }
    if (r?.isSuccess) {
      return { walletAddress: w.address, status: 'success', positionsCount: r.data.length }
    }
    return { walletAddress: w.address, status: 'loading', positionsCount: 0 }
  })

  const failedCount = statuses.filter((s) => s.status === 'error').length
  const successCount = statuses.filter((s) => s.status === 'success').length
  const loadingCount = statuses.filter((s) => s.status === 'loading').length
  const walletCount = wallets.length
  const isPartial = failedCount > 0 && failedCount < walletCount

  // Derive positions → filtered → aggregated → grouped. Recomputes only when a query
  // updates or a view control changes (signature keeps it off the render hot path).
  const signature = results.map((r) => `${r.status}:${r.dataUpdatedAt}:${r.errorUpdatedAt}`).join('|')
  const derived = useMemo(() => {
    const raw = results.flatMap((r) => r.data ?? [])
    let positions = normalize(raw)
    if (!showSpam) positions = positions.filter((p) => !p.token.isSpam)
    positions = filterPositions(positions, search)
    const { assets, totalValueUsd } = aggregate(positions)
    return {
      positionCount: positions.length,
      assetCount: assets.length,
      totalValueUsd,
      view: buildGroupedView(positions, groupKey),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` captures `results`
  }, [signature, showSpam, search, groupKey])

  let uiState: PortfolioUiState
  if (walletCount === 0) uiState = 'idle'
  else if (failedCount === walletCount) uiState = 'error'
  else if (failedCount > 0) uiState = 'partial'
  else if (successCount === 0) uiState = 'loading'
  else if (derived.positionCount === 0 && loadingCount === 0) uiState = 'empty'
  else uiState = 'loaded'

  return {
    uiState,
    statuses,
    walletCount,
    successCount,
    failedCount,
    loadingCount,
    isPartial,
    totalValueUsd: derived.totalValueUsd,
    assetCount: derived.assetCount,
    groupKey,
    view: derived.view,
    isFetching: results.some((r) => r.isFetching),
    retryFailed: () => results.forEach((r) => r.isError && r.refetch()),
    refetchAll: () => results.forEach((r) => r.refetch()),
  }
}
