import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { usePortfolio } from './usePortfolio'
import { useUiStore } from '@/store/uiStore'
import { SAMPLE_WALLETS, ALICE } from '@/data/mock/fixtures'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => {
  useUiStore.setState({ wallets: [], groupKey: 'token', search: '', showSpam: false })
})

describe('usePortfolio', () => {
  it('is idle with no wallets', () => {
    const { result } = renderHook(() => usePortfolio(), { wrapper: makeWrapper() })
    expect(result.current.uiState).toBe('idle')
  })

  it('renders successes and flags partial failure when one wallet fails', async () => {
    useUiStore.setState({ wallets: SAMPLE_WALLETS }) // includes the always-failing wallet
    const { result } = renderHook(() => usePortfolio(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isFetching).toBe(false), { timeout: 3000 })
    expect(result.current.uiState).toBe('partial')
    expect(result.current.failedCount).toBe(1)
    expect(result.current.isPartial).toBe(true)
    expect(result.current.totalValueUsd).toBeGreaterThan(0) // funded wallets still rendered
  })

  it('regroups without refetching — same data, different view shape', async () => {
    useUiStore.setState({ wallets: [{ address: ALICE, chainIds: [1, 8453, 42161] }] })
    const { result } = renderHook(() => usePortfolio(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.uiState).toBe('loaded'), { timeout: 3000 })
    const tokenGroupCount = result.current.view.length
    expect(tokenGroupCount).toBeGreaterThan(0)

    act(() => useUiStore.setState({ groupKey: 'network' }))
    await waitFor(() => expect(result.current.groupKey).toBe('network'))
    // Alice holds on Ethereum, Base, Arbitrum → exactly 3 network groups, no refetch.
    expect(result.current.view.length).toBe(3)
  })

  it('hides spam by default and reveals it when toggled', async () => {
    useUiStore.setState({ wallets: [{ address: ALICE, chainIds: [1, 8453, 42161] }] })
    const { result } = renderHook(() => usePortfolio(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.uiState).toBe('loaded'), { timeout: 3000 })

    const hidden = result.current.assetCount
    act(() => useUiStore.setState({ showSpam: true }))
    await waitFor(() => expect(result.current.assetCount).toBeGreaterThan(hidden))
  })
})
