import { describe, expect, it } from 'vitest'
import { cashChange, quickCashAmounts, validateSplit } from './payments'

describe('cashChange', () => {
  it('returns change when overpaid', () => {
    expect(cashChange(169, 500)).toEqual({ valid: true, change: 331 })
  })
  it('exact payment is valid with zero change', () => {
    expect(cashChange(169, 169)).toEqual({ valid: true, change: 0 })
  })
  it('short payment is invalid', () => {
    expect(cashChange(169, 150).valid).toBe(false)
  })
})

describe('quickCashAmounts', () => {
  it('skips notes below the total', () => {
    expect(quickCashAmounts(169)).toEqual([169, 200, 500, 2000])
  })
  it('includes 100 when the total is under 100', () => {
    expect(quickCashAmounts(84)).toEqual([84, 100, 200, 500, 2000])
  })
  it('does not repeat a note equal to the total', () => {
    expect(quickCashAmounts(200)).toEqual([200, 500, 2000])
  })
})

describe('validateSplit (total 113)', () => {
  it('Cash 100 + UPI 13 is valid', () => {
    expect(validateSplit(113, { cash: 100, upi: 13 }).valid).toBe(true)
  })
  it('Cash 60 + UPI 43 + Card 10 is valid', () => {
    expect(validateSplit(113, { cash: 60, upi: 43, card: 10 }).valid).toBe(true)
  })
  it('one mode alone is not a split', () => {
    expect(validateSplit(113, { cash: 113 }).valid).toBe(false)
    expect(validateSplit(113, { cash: 113, upi: 0 }).valid).toBe(false)
  })
  it('short sum is invalid with remaining shown', () => {
    const r = validateSplit(113, { cash: 100, upi: 10 })
    expect(r.valid).toBe(false)
    expect(r.remaining).toBe(3)
  })
  it('over sum is invalid with negative remaining', () => {
    const r = validateSplit(113, { cash: 100, upi: 13, card: 1 })
    expect(r.valid).toBe(false)
    expect(r.remaining).toBe(-1)
  })
  it('negative amount is invalid', () => {
    expect(validateSplit(113, { cash: 120, upi: -7 }).valid).toBe(false)
  })
  it('non-whole-rupee amount is invalid', () => {
    expect(validateSplit(113, { cash: 100.5, upi: 12.5 }).valid).toBe(false)
  })
})
