// Pure payment helpers. Amounts here are whole rupees (bill totals are always
// whole rupees after round-off); callers convert to/from paise.

export type PayMode = 'upi' | 'card' | 'cash'

const DENOMINATIONS = [100, 200, 500, 2000]

const isWhole = (n: number) => Number.isFinite(n) && Number.isInteger(n)

export function cashChange(total: number, received: number): { valid: boolean; change: number } {
  if (!isWhole(received) || received < total) return { valid: false, change: 0 }
  return { valid: true, change: received - total }
}

// First entry is "Exact" (the total itself), then each note at or above the total.
export function quickCashAmounts(total: number): number[] {
  return [total, ...DENOMINATIONS.filter((d) => d > total)]
}

export interface SplitResult {
  valid: boolean
  remaining: number // total - sum; negative when over
  error?: string
}

export function validateSplit(total: number, amountsByMode: Partial<Record<PayMode, number>>): SplitResult {
  const amounts = Object.values(amountsByMode).map((a) => a ?? 0)
  const sum = amounts.reduce((s, a) => s + (Number.isFinite(a) ? a : 0), 0)
  const remaining = total - sum
  if (amounts.some((a) => !isWhole(a) || a < 0)) {
    return { valid: false, remaining, error: 'Amounts must be whole rupees, 0 or more' }
  }
  if (remaining !== 0) return { valid: false, remaining, error: 'Amounts must add up to the total' }
  if (amounts.filter((a) => a > 0).length < 2) {
    return { valid: false, remaining, error: 'Split needs at least two modes' }
  }
  return { valid: true, remaining }
}
