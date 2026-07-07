import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { useUiStore } from '@/store/uiStore'
import { FAILING_WALLET, EMPTY_WALLET } from '@/data/mock/fixtures'

// Drives the real component tree end-to-end (F1–F8) in jsdom.
function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  )
}

beforeEach(() => useUiStore.setState({ wallets: [], groupKey: 'token', search: '', showSpam: false }))

describe('App end-to-end', () => {
  it('starts idle, then loads the sample into a partial-failure portfolio', async () => {
    const user = userEvent.setup()
    renderApp()
    expect(screen.getByText('No wallets yet')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /load sample portfolio/i })[0])

    // Partial-failure banner (the cold-storage wallet always fails) + successes still render.
    // The failing wallet errors immediately while funded wallets are still loading, so await
    // the successes rather than reading them synchronously.
    expect(await screen.findByText(/1 of 4 wallets failed to load/i)).toBeInTheDocument()
    expect(await screen.findByText('USDC')).toBeInTheDocument()
    expect(await screen.findByText('USDC.e')).toBeInTheDocument() // bridged stays distinct from USDC
    expect(await screen.findByText('partial')).toBeInTheDocument() // total flagged partial
  })

  it('switches groupings without refetching (network → wallet)', async () => {
    useUiStore.setState({ wallets: [{ address: '0xA11ce00000000000000000000000000000000001', label: 'alice.eth', chainIds: [1, 8453, 42161] }] })
    renderApp()
    await screen.findByText('USDC') // loaded

    fireEvent.click(screen.getByRole('tab', { name: 'Network' }))
    expect(await screen.findByText('Base')).toBeInTheDocument() // full chain name = network group header
    expect(screen.getByText('Arbitrum')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Wallet' }))
    expect(await screen.findByText('alice.eth')).toBeInTheDocument()
  })

  it('filters via search', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ wallets: [{ address: '0xA11ce00000000000000000000000000000000001', chainIds: [1, 8453, 42161] }] })
    renderApp()
    await screen.findByText('USDC')

    await user.type(screen.getByLabelText('Search'), 'weth')
    await waitFor(() => expect(screen.queryByText('USDC')).not.toBeInTheDocument())
    expect(screen.getByText('WETH')).toBeInTheDocument()
  })

  it('hides spam until the toggle is enabled', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ wallets: [{ address: '0xA11ce00000000000000000000000000000000001', chainIds: [1] }] })
    renderApp()
    await screen.findByText('USDC')
    expect(screen.queryByText('CLAIM-AIRDROP.COM')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Show spam'))
    expect(await screen.findByText('CLAIM-AIRDROP.COM')).toBeInTheDocument()
  })

  it('shows the empty state for a funded-nothing wallet', async () => {
    useUiStore.setState({ wallets: [{ address: EMPTY_WALLET, chainIds: [1] }] })
    renderApp()
    expect(await screen.findByText('No tokens found')).toBeInTheDocument()
  })

  it('shows the full error state when every wallet fails', async () => {
    useUiStore.setState({ wallets: [{ address: FAILING_WALLET, chainIds: [1] }] })
    renderApp()
    expect(await screen.findByText(/couldn’t load any wallets/i)).toBeInTheDocument()
  })
})
