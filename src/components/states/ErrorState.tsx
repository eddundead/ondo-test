/** Full-page error shown when every wallet fails (F7). */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 text-center">
      <p className="text-base font-medium text-red-800">Couldn’t load any wallets</p>
      <p className="mt-1 max-w-sm text-sm text-red-600">
        Every wallet request failed. Check the addresses or networks and try again.
      </p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Retry all
      </button>
    </div>
  )
}
