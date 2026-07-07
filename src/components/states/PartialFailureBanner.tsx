import { useState } from 'react'
import type { FetchStatus } from '@/domain/types'
import { truncateAddress } from '@/lib/format'

/** Dismissible banner shown when some wallets fail but others succeed (F7). */
export function PartialFailureBanner({
  failedCount,
  walletCount,
  statuses,
  onRetry,
}: {
  failedCount: number
  walletCount: number
  statuses: FetchStatus[]
  onRetry: () => void
}) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const failed = statuses.filter((s) => s.status === 'error')
  return (
    <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="text-sm">
        <p className="font-medium text-amber-800">
          {failedCount} of {walletCount} wallets failed to load
        </p>
        <p className="mt-0.5 text-amber-700">
          Showing partial results — {failed.map((f) => truncateAddress(f.walletAddress)).join(', ')}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={onRetry}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Retry failed
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
