import * as Tabs from '@radix-ui/react-tabs'
import type { GroupKey } from '@/domain/types'
import { useUiStore } from '@/store/uiStore'
import { formatUsd } from '@/lib/format'
import { cn } from '@/lib/cn'

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: 'token', label: 'Token' },
  { key: 'network', label: 'Network' },
  { key: 'wallet', label: 'Wallet' },
]

/** Totals + partial badge + grouping tabs + search + spam toggle + refresh (F5, F6, F8). */
export function PortfolioHeader({
  totalValueUsd,
  assetCount,
  isPartial,
  isFetching,
  onRefresh,
}: {
  totalValueUsd: number
  assetCount: number
  isPartial: boolean
  isFetching: boolean
  onRefresh: () => void
}) {
  const groupKey = useUiStore((s) => s.groupKey)
  const setGroupKey = useUiStore((s) => s.setGroupKey)
  const search = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)
  const showSpam = useUiStore((s) => s.showSpam)
  const setShowSpam = useUiStore((s) => s.setShowSpam)

  return (
    <div className="mb-4 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-slate-500">
            Total value
            {isPartial && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                partial
              </span>
            )}
          </p>
          <p className="text-3xl font-semibold tabular-nums text-slate-900">
            {isPartial && '≈ '}
            {formatUsd(totalValueUsd)}
          </p>
          <p className="text-sm text-slate-500">{assetCount} assets</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs.Root value={groupKey} onValueChange={(v) => setGroupKey(v as GroupKey)}>
          <Tabs.List className="inline-flex rounded-lg bg-slate-100 p-1" aria-label="Group by">
            {GROUPS.map((g) => (
              <Tabs.Trigger
                key={g.key}
                value={g.key}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors',
                  'data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm',
                )}
              >
                {g.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>

        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token, name, wallet…"
            aria-label="Search"
            className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
          />
          <label className="flex select-none items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showSpam}
              onChange={(e) => setShowSpam(e.target.checked)}
            />
            Show spam
          </label>
        </div>
      </div>
    </div>
  )
}
