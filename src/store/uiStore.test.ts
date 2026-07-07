import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'
import { SAMPLE_WALLETS } from '@/data/mock/fixtures'

const reset = () => useUiStore.setState({ wallets: [], groupKey: 'token', search: '', showSpam: false })

describe('uiStore', () => {
  beforeEach(reset)

  it('adds wallets and dedupes by address (case-insensitive)', () => {
    const { addWallet } = useUiStore.getState()
    addWallet({ address: '0xAbc', chainIds: [1] })
    addWallet({ address: '0xabc', chainIds: [1, 8453] }) // duplicate → ignored
    expect(useUiStore.getState().wallets).toHaveLength(1)
  })

  it('removes a wallet by address', () => {
    useUiStore.setState({ wallets: [{ address: '0xA', chainIds: [1] }, { address: '0xB', chainIds: [1] }] })
    useUiStore.getState().removeWallet('0xa')
    expect(useUiStore.getState().wallets.map((w) => w.address)).toEqual(['0xB'])
  })

  it('loads the sample portfolio', () => {
    useUiStore.getState().loadSample()
    expect(useUiStore.getState().wallets).toEqual(SAMPLE_WALLETS)
  })

  it('updates view controls', () => {
    const s = useUiStore.getState()
    s.setGroupKey('network')
    s.setSearch('usdc')
    s.setShowSpam(true)
    const next = useUiStore.getState()
    expect(next.groupKey).toBe('network')
    expect(next.search).toBe('usdc')
    expect(next.showSpam).toBe(true)
  })
})
