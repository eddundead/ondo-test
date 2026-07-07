import { usePortfolio } from '@/hooks/usePortfolio'
import { useUiStore } from '@/store/uiStore'
import { WalletManager } from '@/components/WalletManager'
import { PortfolioHeader } from '@/components/PortfolioHeader'
import { GroupedPortfolio } from '@/components/GroupedPortfolio'
import { Loading } from '@/components/states/Loading'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { PartialFailureBanner } from '@/components/states/PartialFailureBanner'

export default function App() {
  const p = usePortfolio()
  const loadSample = useUiStore((s) => s.loadSample)

  // States with data or useful controls show the header; loading/error/idle don't.
  const showHeader = p.uiState === 'loaded' || p.uiState === 'partial' || p.uiState === 'empty'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <h1 className="text-lg font-semibold">Portfolio Explorer</h1>
          <p className="text-sm text-slate-500">Multi-chain portfolio aggregation</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <WalletManager statuses={p.statuses} />

        {p.uiState === 'idle' && (
          <EmptyState
            title="No wallets yet"
            description="Add a wallet address above, or load a sample portfolio to explore."
            action={
              <button
                onClick={loadSample}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Load sample portfolio
              </button>
            }
          />
        )}

        {p.uiState !== 'idle' && (
          <section>
            {showHeader && (
              <PortfolioHeader
                totalValueUsd={p.totalValueUsd}
                assetCount={p.assetCount}
                isPartial={p.isPartial}
                isFetching={p.isFetching}
                onRefresh={p.refetchAll}
              />
            )}

            {p.uiState === 'partial' && (
              <PartialFailureBanner
                failedCount={p.failedCount}
                walletCount={p.walletCount}
                statuses={p.statuses}
                onRetry={p.retryFailed}
              />
            )}

            {p.uiState === 'loading' && <Loading />}
            {p.uiState === 'error' && <ErrorState onRetry={p.refetchAll} />}
            {p.uiState === 'empty' && (
              <EmptyState
                title="No tokens found"
                description="These wallets hold no tokens on the selected networks (spam is hidden by default)."
              />
            )}
            {(p.uiState === 'loaded' || p.uiState === 'partial') && (
              <GroupedPortfolio view={p.view} groupKey={p.groupKey} />
            )}
          </section>
        )}
      </main>
    </div>
  )
}
