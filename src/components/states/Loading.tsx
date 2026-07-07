/** Skeleton rows shown while all wallets are still loading. */
export function Loading() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading portfolio">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  )
}
