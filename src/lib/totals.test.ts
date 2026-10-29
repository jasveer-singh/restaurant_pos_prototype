import { describe, expect, it } from 'vitest'
import { calculateTotals, discountAmount, lineNet } from './totals'
import type { TotalsLine } from './totals'

// Regular Masala Chai (35) + Extra Ginger (10) = 45 per unit
const chai: TotalsLine = { unitPrice: 4500, quantity: 2 }

describe('calculateTotals', () => {
  it('headline: 2x Regular Masala Chai + Extra Ginger, no discount = 95.00', () => {
    const t = calculateTotals([chai])
    expect(t.subtotal).toBe(9000)
    expect(t.cgst).toBe(225)
    expect(t.sgst).toBe(225)
    expect(t.roundOff).toBe(50)
    expect(t.total).toBe(9500)
  })

  it('headline: same cart with flat Rs 10 bill discount = 84.00', () => {
    const t = calculateTotals([chai], { type: 'flat', value: 1000 })
    expect(t.discount).toBe(1000)
    expect(t.taxable).toBe(8000)
    expect(t.cgst + t.sgst).toBe(400)
    expect(t.roundOff).toBe(0)
    expect(t.total).toBe(8400)
  })

  // Half-rupee rounding: amounts ending in exactly 50 paise round up.
  it('half-rupee rounding: 80.00 cart total is 84.00', () => {
    expect(calculateTotals([{ unitPrice: 4000, quantity: 2 }]).total).toBe(8400)
  })

  it('half-rupee rounding: 70.00 + 3.50 GST = 73.50 rounds up to 74.00 (+0.50)', () => {
    const t = calculateTotals([{ unitPrice: 4000, quantity: 2 }], { type: 'flat', value: 1000 })
    expect(t.cgst + t.sgst).toBe(350)
    expect(t.roundOff).toBe(50)
    expect(t.total).toBe(7400)
  })

  it('applies item discount, then bill discount on the remainder', () => {
    const t = calculateTotals(
      [{ ...chai, discount: { type: 'percent', value: 10 } }],
      { type: 'percent', value: 10 },
    )
    expect(t.itemDiscount).toBe(900)
    expect(t.billDiscount).toBe(810) // 10% of 81.00
    expect(t.taxable).toBe(7290)
    expect(t.cgst).toBe(182) // 1.8225 -> 182 each, rounded separately
    expect(t.sgst).toBe(182)
    expect(t.total).toBe(7700) // 72.90 + 3.64 = 76.54 -> 77
    expect(t.roundOff).toBe(46)
  })

  it('rounds CGST and SGST separately', () => {
    const t = calculateTotals([{ unitPrice: 1010, quantity: 1 }]) // 2.5% = 25.25
    expect(t.cgst).toBe(25)
    expect(t.sgst).toBe(25)
  })

  it('rounds down when under half a rupee', () => {
    const t = calculateTotals([{ unitPrice: 2000, quantity: 1 }]) // 20 + 1 = 21
    expect(t.total).toBe(2100)
    expect(t.roundOff).toBe(0)
    const u = calculateTotals([{ unitPrice: 1100, quantity: 1 }]) // 11 + 0.56 (0.28+0.28)
    expect(u.total).toBe(1100 + 56 + u.roundOff)
    expect(u.total % 100).toBe(0)
  })

  it('empty cart is all zero', () => {
    expect(calculateTotals([])).toMatchObject({ subtotal: 0, discount: 0, cgst: 0, sgst: 0, roundOff: 0, total: 0 })
  })
})

describe('discountAmount', () => {
  it('caps flat discount at the base', () => {
    expect(discountAmount(5000, { type: 'flat', value: 9000 })).toBe(5000)
  })
  it('caps percent at 100%', () => {
    expect(discountAmount(5000, { type: 'percent', value: 150 })).toBe(5000)
  })
  it('zero or missing clears the discount', () => {
    expect(discountAmount(5000, { type: 'flat', value: 0 })).toBe(0)
    expect(discountAmount(5000, null)).toBe(0)
  })
  it('rounds percent to the nearest paise', () => {
    expect(discountAmount(333, { type: 'percent', value: 10 })).toBe(33)
    expect(discountAmount(335, { type: 'percent', value: 10 })).toBe(34)
  })
})

describe('lineNet', () => {
  it('applies a line discount to unit price x quantity', () => {
    expect(lineNet({ ...chai, discount: { type: 'flat', value: 500 } })).toBe(8500)
  })
})
