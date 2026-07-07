// Client-only view state (N2). Server data stays in React Query — this store never holds it.
// Grouping key, search term, spam toggle, and the wallet list (Seam 2 address source).

import { create } from 'zustand'
import { SAMPLE_WALLETS } from '@/data/mock/fixtures'
import type { GroupKey, WalletInput } from '@/domain/types'

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

interface UiState {
  wallets: WalletInput[]
  groupKey: GroupKey
  search: string
  showSpam: boolean

  addWallet: (wallet: WalletInput) => void
  removeWallet: (address: string) => void
  loadSample: () => void
  clearWallets: () => void
  setGroupKey: (key: GroupKey) => void
  setSearch: (search: string) => void
  setShowSpam: (showSpam: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  wallets: [],
  groupKey: 'token',
  search: '',
  showSpam: false, // default: hide provider-flagged spam (open decision default)

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
}))
