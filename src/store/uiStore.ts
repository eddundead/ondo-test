// Client-only view state (N2). Server data stays in React Query — this store never holds it.
// Grouping key, search term, spam toggle, wallet list (Seam 2), and the persisted watchlist.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SAMPLE_WALLETS } from '@/data/mock/fixtures'
import type { GroupKey, WalletInput } from '@/domain/types'

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

interface UiState {
  wallets: WalletInput[]
  groupKey: GroupKey
  search: string
  showSpam: boolean
  /** Watched canonical asset ids (a set, kept as an array so it serializes for persistence). */
  watchlist: string[]
  /** Filter the view to watched assets only. */
  watchlistOnly: boolean

  addWallet: (wallet: WalletInput) => void
  removeWallet: (address: string) => void
  loadSample: () => void
  clearWallets: () => void
  setGroupKey: (key: GroupKey) => void
  setSearch: (search: string) => void
  setShowSpam: (showSpam: boolean) => void
  toggleWatch: (canonicalId: string) => void
  setWatchlistOnly: (watchlistOnly: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      wallets: [],
      groupKey: 'token',
      search: '',
      showSpam: false, // default: hide provider-flagged spam (open decision default)
      watchlist: [],
      watchlistOnly: false,

      addWallet: (wallet) =>
        set((s) =>
          s.wallets.some((w) => sameAddress(w.address, wallet.address))
            ? s // dedupe: same address entered twice is a no-op
            : { wallets: [...s.wallets, wallet] },
        ),
      removeWallet: (address) =>
        set((s) => ({ wallets: s.wallets.filter((w) => !sameAddress(w.address, address)) })),
      loadSample: () => set({ wallets: SAMPLE_WALLETS }),
      clearWallets: () => set({ wallets: [] }),
      setGroupKey: (groupKey) => set({ groupKey }),
      setSearch: (search) => set({ search }),
      setShowSpam: (showSpam) => set({ showSpam }),
      toggleWatch: (canonicalId) =>
        set((s) => ({
          watchlist: s.watchlist.includes(canonicalId)
            ? s.watchlist.filter((id) => id !== canonicalId)
            : [...s.watchlist, canonicalId],
        })),
      setWatchlistOnly: (watchlistOnly) => set({ watchlistOnly }),
    }),
    {
      name: 'portfolio-ui',
      // Persist only durable preferences — not transient wallets/search.
      partialize: (s) => ({ watchlist: s.watchlist, watchlistOnly: s.watchlistOnly }),
    },
  ),
)
