// Display formatting helpers. Balance math stays in the domain; these are presentation only.

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? 6 : 2,
  }).format(value)
}

export function formatAmount(value: number): string {
  if (value === 0) return '0'
  const maximumFractionDigits = value >= 1000 ? 2 : value >= 1 ? 4 : 6
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

export function truncateAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
