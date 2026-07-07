// Composition root. For now a static shell; T8–T10 mount the wallet manager,
// grouped portfolio, and UX-state components here.
export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <h1 className="text-lg font-semibold">Portfolio Explorer</h1>
          <p className="text-sm text-slate-500">
            Multi-chain portfolio aggregation
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-sm text-slate-600">
          Scaffold ready. Domain, data, hooks, and UI layers land in T2–T10.
        </p>
      </main>
    </div>
  )
}
