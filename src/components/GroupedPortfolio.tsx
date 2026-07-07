import { useState } from 'react'
import type { GroupView } from '@/domain/groupedView'
import type { AggregatedAsset, GroupKey } from '@/domain/types'
import { chainName, chainShort } from '@/domain/chains'
import { useUiStore } from '@/store/uiStore'
import { formatAmount, formatUsd, truncateAddress } from '@/lib/format'

/** Renders the active grouping (F5). Token view is one flat table; network/wallet are sectioned. */
export function GroupedPortfolio({ view, groupKey }: { view: GroupView[]; groupKey: GroupKey }) {
  const wallets = useUiStore((s) => s.wallets)
  const walletLabel = (address: string) =>
    wallets.find((w) => w.address.toLowerCase() === address.toLowerCase())?.label ??
    truncateAddress(address)

  if (groupKey === 'token') {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <AssetTable assets={view.flatMap((g) => g.assets)} walletLabel={walletLabel} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {view.map((group) => (
        <div key={group.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <span className="font-medium text-slate-700">
              {groupKey === 'network' ? chainName(Number(group.key)) : walletLabel(group.key)}
            </span>
            <span className="text-sm font-medium tabular-nums text-slate-600">
              {formatUsd(group.totalValueUsd)}
            </span>
          </div>
          <AssetTable assets={group.assets} walletLabel={walletLabel} />
        </div>
      ))}
    </div>
  )
}

function AssetTable({
  assets,
  walletLabel,
}: {
  assets: AggregatedAsset[]
  walletLabel: (address: string) => string
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
          <th className="px-4 py-2 font-medium">Asset</th>
          <th className="px-4 py-2 font-medium">Networks</th>
          <th className="px-4 py-2 text-right font-medium">Amount</th>
          <th className="px-4 py-2 text-right font-medium">Value</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <AssetRow key={asset.canonicalId} asset={asset} walletLabel={walletLabel} />
        ))}
      </tbody>
    </table>
  )
}

function AssetRow({
  asset,
  walletLabel,
}: {
  asset: AggregatedAsset
  walletLabel: (address: string) => string
}) {
  const [open, setOpen] = useState(false)
  const watched = useUiStore((s) => s.watchlist.includes(asset.canonicalId))
  const toggleWatch = useUiStore((s) => s.toggleWatch)
  const chainIds = [...new Set(asset.positions.map((p) => p.chainId))]

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="cursor-pointer border-b border-slate-50 hover:bg-slate-50"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation() // don't toggle the row
                toggleWatch(asset.canonicalId)
              }}
              aria-pressed={watched}
              aria-label={watched ? `Unwatch ${asset.token.symbol}` : `Watch ${asset.token.symbol}`}
              className={watched ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}
            >
              {watched ? '★' : '☆'}
            </button>
            <span className="w-3 text-slate-400">{open ? '▾' : '▸'}</span>
            <div>
              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                {asset.token.symbol}
                {asset.token.identitySource === 'symbol' && (
                  <span
                    title="Low-confidence identity — matched by symbol only"
                    className="rounded bg-slate-100 px-1 text-[10px] font-normal text-slate-400"
                  >
                    ?
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">{asset.token.name}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {chainIds.map((id) => (
              <ChainBadge key={id} id={id} />
            ))}
          </div>
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
          {formatAmount(asset.totalBalance)}
        </td>
        <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
          {formatUsd(asset.totalValueUsd)}
        </td>
      </tr>

      {open &&
        asset.positions.map((p) => (
          <tr key={p.id} className="bg-slate-50/60 text-xs text-slate-500">
            <td className="py-2 pl-10 pr-4">{walletLabel(p.walletAddress)}</td>
            <td className="px-4 py-2">
              <ChainBadge id={p.chainId} />
            </td>
            <td className="px-4 py-2 text-right tabular-nums">{formatAmount(p.balance)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{formatUsd(p.valueUsd)}</td>
          </tr>
        ))}
    </>
  )
}

function ChainBadge({ id }: { id: number }) {
  return (
    <span
      title={chainName(id)}
      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
    >
      {chainShort(id)}
    </span>
  )
}
