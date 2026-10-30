import { describe, expect, it } from 'vitest'
import { lastOrders, mergeLines, normalizePhone, repeatLines, searchCustomers } from './customers'
import { calculateTotals } from './totals'
import type { AddOnGroup, Bill, BillLine, Customer, Item } from './types'

describe('normalizePhone', () => {
  it('keeps digits only', () => {
    expect(normalizePhone('98765 43210')).toEqual({ phone: '9876543210', valid: true })
  })
  it('strips +91', () => {
    expect(normalizePhone('+91 98765-43210')).toEqual({ phone: '9876543210', valid: true })
  })
  it('strips a leading 91 on a 12-digit number', () => {
    expect(normalizePhone('919876543210').phone).toBe('9876543210')
  })
  it('strips a leading 0', () => {
    expect(normalizePhone('09876543210')).toEqual({ phone: '9876543210', valid: true })
  })
  it('rejects short, 9-digit and non 6-9 numbers', () => {
    expect(normalizePhone('12345').valid).toBe(false)
    expect(normalizePhone('5876543210').valid).toBe(false)
    expect(normalizePhone('987654321').valid).toBe(false)
  })
  it('does not strip a 91 prefix while typing a short number', () => {
    expect(normalizePhone('910').phone).toBe('910')
  })
})

const cust = (phone: string): Customer => ({ id: phone, phone, createdAt: '2026-10-01T00:00:00.000Z' })

describe('searchCustomers', () => {
  const three = ['9876543210', '9123456780', '9988776655'].map(cust)
  it('matches on the last digits', () => {
    expect(searchCustomers(three, '3210').map((c) => c.phone)).toEqual(['9876543210'])
  })
  it('needs 3 digits', () => {
    expect(searchCustomers(three, '98')).toEqual([])
  })
  it('matches a 3-digit prefix', () => {
    expect(searchCustomers(three, '987').map((c) => c.phone)).toEqual(['9876543210'])
  })
  it('puts matches at the end of the number first', () => {
    const two = [cust('9123456780'), cust('9000000123')]
    expect(searchCustomers(two, '123').map((c) => c.phone)).toEqual(['9000000123', '9123456780'])
  })
  it('returns at most 5', () => {
    const many = Array.from({ length: 8 }, (_, i) => cust(`987654321${i}`))
    expect(searchCustomers(many, '9876')).toHaveLength(5)
  })
})

const chaiLine: BillLine = {
  itemId: 'itm_masala_chai', name: 'Masala Chai', variantName: 'Regular', addOnNames: ['Extra Ginger'],
  quantity: 2, unitPrice: 4500, discount: null, discountAmount: 0, lineTotal: 9000,
}
const vadaLine: BillLine = {
  itemId: 'itm_vada_pav', name: 'Vada Pav', variantName: null, addOnNames: [],
  quantity: 1, unitPrice: 2500, discount: null, discountAmount: 0, lineTotal: 2500,
}

const totalsFor = (lines: BillLine[]) => {
  const t = calculateTotals(lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })))
  return { subtotal: t.subtotal, itemDiscount: t.itemDiscount, billDiscount: t.billDiscount, cgst: t.cgst, sgst: t.sgst, roundOff: t.roundOff, total: t.total }
}

const bill = (id: string, customerId: string | null, createdAt: string, over: Partial<Bill> = {}): Bill => ({
  id, billNumber: id, token: 1, orderType: 'takeaway', cashier: 'Cashier 1', customerId, createdAt,
  status: 'completed', billingMs: 1000, printCount: 0, lines: [chaiLine, vadaLine], billDiscount: null,
  totals: totalsFor([chaiLine, vadaLine]), ...over,
})

describe('lastOrders', () => {
  const bills = [
    bill('a1', '9876543210', '2026-10-01T10:00:00.000Z'),
    bill('a2', '9876543210', '2026-10-03T10:00:00.000Z'),
    bill('x1', '9123456780', '2026-10-04T10:00:00.000Z'),
    bill('a3', '9876543210', '2026-10-02T10:00:00.000Z'),
    bill('a4', '9876543210', '2026-10-05T10:00:00.000Z'),
  ]
  it("returns the customer's 3 newest, newest first, never another customer's", () => {
    expect(lastOrders(bills, '9876543210', 3).map((b) => b.id)).toEqual(['a4', 'a2', 'a3'])
  })
})

const menu = (withVada = true) => {
  const items: Item[] = [
    {
      id: 'itm_masala_chai', code: 'MC', name: 'Masala Chai', categoryId: 'c', isVeg: true, isBestSeller: true, station: 's',
      variants: [{ id: 'v_regular', name: 'Regular', price: 35 }, { id: 'v_large', name: 'Large', price: 50 }],
      addOnGroupIds: ['grp_chai'],
    },
    ...(withVada
      ? [{ id: 'itm_vada_pav', code: 'VP', name: 'Vada Pav', categoryId: 'c', isVeg: true, isBestSeller: false, station: 's',
          variants: [{ id: 'v_single', name: 'Single', price: 25 }], addOnGroupIds: [] } as Item]
      : []),
  ]
  const addOnGroups: AddOnGroup[] = [
    { id: 'grp_chai', name: 'Chai', maxSelect: 3, options: [{ id: 'ao_extra_ginger', name: 'Extra Ginger', price: 10 }] },
  ]
  return { items, addOnGroups }
}

describe('repeatLines', () => {
  it('reproduces the same lines', () => {
    const r = repeatLines(bill('b', null, ''), menu())
    expect(r.skipped).toEqual([])
    expect(r.lines).toHaveLength(2)
    expect(r.lines[0]).toMatchObject({
      itemId: 'itm_masala_chai', variantId: 'v_regular', variantName: 'Regular', addOnIds: ['ao_extra_ginger'],
      addOnNames: ['Extra Ginger'], quantity: 2, unitPrice: 4500, discount: null,
    })
    expect(r.lines[1]).toMatchObject({ itemId: 'itm_vada_pav', variantId: 'v_single', quantity: 1, unitPrice: 2500 })
  })
  it('skips an item that is no longer on the menu and reports it', () => {
    const r = repeatLines(bill('b', null, ''), menu(false))
    expect(r.lines.map((l) => l.itemName)).toEqual(['Masala Chai'])
    expect(r.skipped).toEqual(['Vada Pav'])
  })
  it('skips a missing variant or add-on', () => {
    const m = menu()
    m.items[0].variants = [{ id: 'v_large', name: 'Large', price: 50 }]
    expect(repeatLines(bill('b', null, ''), m).skipped).toEqual(['Masala Chai (Regular)'])
    const m2 = menu()
    m2.addOnGroups[0].options = []
    expect(repeatLines(bill('b', null, ''), m2).skipped).toEqual(['Masala Chai (Extra Ginger)'])
  })
  it('re-prices from the current menu', () => {
    const m = menu()
    m.items[0].variants[0].price = 40
    expect(repeatLines(bill('b', null, ''), m).lines[0].unitPrice).toBe(5000)
  })
  it('never carries discounts over', () => {
    const discounted = bill('b', null, '', {
      lines: [{ ...chaiLine, discount: { type: 'percent', value: 10 }, discountAmount: 900, lineTotal: 8100 }],
      billDiscount: { type: 'flat', value: 500 },
    })
    expect(repeatLines(discounted, menu()).lines[0].discount).toBeNull()
  })
})

describe('mergeLines', () => {
  const { lines } = repeatLines(bill('b', null, ''), menu())
  it('repeating the same order twice doubles quantities with no duplicate lines', () => {
    const merged = mergeLines(mergeLines([], lines), lines)
    expect(merged).toHaveLength(2)
    expect(merged.map((l) => l.quantity)).toEqual([4, 2])
  })
  it('does not mutate the cart or the new lines', () => {
    const cart = mergeLines([], lines)
    mergeLines(cart, lines)
    expect(cart.map((l) => l.quantity)).toEqual([2, 1])
    expect(lines.map((l) => l.quantity)).toEqual([2, 1])
  })
  it('repeating into an empty cart gives the original bill totals', () => {
    const original = bill('b', null, '')
    const merged = mergeLines([], repeatLines(original, menu()).lines)
    const t = calculateTotals(merged)
    expect(t.subtotal).toBe(original.totals.subtotal)
    expect(t.cgst).toBe(original.totals.cgst)
    expect(t.sgst).toBe(original.totals.sgst)
    expect(t.roundOff).toBe(original.totals.roundOff)
    expect(t.total).toBe(original.totals.total)
  })
})
