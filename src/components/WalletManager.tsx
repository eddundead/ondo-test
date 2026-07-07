import { useState, type FormEvent } from 'react'
import { CHAINS } from '@/domain/chains'
import type { FetchStatus } from '@/domain/types'
import { useUiStore } from '@/store/uiStore'
import { truncateAddress } from '@/lib/format'
import { cn } from '@/lib/cn'

const SUPPORTED = Object.values(CHAINS)
const DEFAULT_CHAINS = [1, 8453, 42161]
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

/** Manual wallet entry (Seam 2 address source) + per-wallet status + sample loader. */
export function WalletManager({ statuses }: { statuses: FetchStatus[] }) {
  const wallets = useUiStore((s) => s.wallets)
  const addWallet = useUiStore((s) => s.addWallet)
  const removeWallet = useUiStore((s) => s.removeWallet)
  const loadSample = useUiStore((s) => s.loadSample)
  const clearWallets = useUiStore((s) => s.clearWallets)

  const [address, setAddress] = useState('')
  const [chains, setChains] = useState<number[]>(DEFAULT_CHAINS)
  const [error, setError] = useState<string | null>(null)

  const statusFor = (addr: string) =>
    statuses.find((s) => s.walletAddress.toLowerCase() === addr.toLowerCase())?.status

  function submit(e: FormEvent) {
    e.preventDefault()
    const a = address.trim()
    if (!ADDRESS_RE.test(a)) return setError('Enter a valid 0x address (40 hex characters).')
    if (chains.length === 0) return setError('Select at least one network.')
    if (wallets.some((w) => w.address.toLowerCase() === a.toLowerCase())) return setError('Wallet already added.')
    addWallet({ address: a, chainIds: [...chains] })
    setAddress('')
    setError(null)
  }

  const toggleChain = (id: number) =>
    setChains((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <form onSubmit={submit} className="flex flex-wrap items-start gap-3">
        <div className="min-w-[280px] flex-1">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x wallet address"
            aria-label="Wallet address"
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-500"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUPPORTED.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleChain(c.id)}
                aria-pressed={chains.includes(c.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  chains.includes(c.id)
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add wallet
        </button>
      </form>

      {wallets.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {wallets.map((w) => (
            <li
              key={w.address}
              className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <StatusDot status={statusFor(w.address)} />
                <span className="font-medium text-slate-700">{w.label ?? truncateAddress(w.address)}</span>
                <span className="font-mono text-xs text-slate-400">{truncateAddress(w.address)}</span>
                <span className="text-xs text-slate-400">· {w.chainIds.length} networks</span>
              </div>
              <button
                onClick={() => removeWallet(w.address)}
                aria-label={`Remove ${w.address}`}
                className="text-slate-400 hover:text-red-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={loadSample}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Load sample portfolio
        </button>
        {wallets.length > 0 && (
          <button
            onClick={clearWallets}
            className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
          >
            Clear all
          </button>
        )}
      </div>
    </section>
  )
}

function StatusDot({ status }: { status?: FetchStatus['status'] }) {
  const color =
    status === 'success'
      ? 'bg-emerald-500'
      : status === 'error'
        ? 'bg-red-500'
        : status === 'loading'
          ? 'bg-amber-400 animate-pulse'
          : 'bg-slate-300'
  return <span className={cn('h-2 w-2 rounded-full', color)} aria-hidden />
}
