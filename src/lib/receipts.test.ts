import { describe, expect, it } from 'vitest'
import { buildBillReceipt, buildKotReceipt, maskPhone } from './receipts'
import type { Bill, Payment } from './types'

const chai = {
  itemId: 'itm_masala_chai', name: 'Masala Chai', variantName: 'Regular', addOnNames: ['Extra Ginger'],
  quantity: 2, unitPrice: 4500, discount: null, discountAmount: 0, lineTotal: 9000,
}
const vada = {
  itemId: 'itm_vada_pav', name: 'Vada Pav', variantName: 'Single', addOnNames: [],
  quantity: 1, unitPrice: 2500, discount: null, discountAmount: 0, lineTotal: 2500,
}

// 90 + 25 = 115; GST 2.88 + 2.88 -> 120.76 -> 121.00 (round off +0.24)
const makeBill = (over: Partial<Bill> = {}): Bill => ({
  id: 'b1', billNumber: '3010260001', token: 1, orderType: 'takeaway', cashier: 'Cashier 1',
  customerId: null, createdAt: new Date(2026, 9, 30, 14, 32).toISOString(), status: 'completed',
  billingMs: 5000, printCount: 0, lines: [chai, vada], billDiscount: null,
  totals: { subtotal: 11500, itemDiscount: 0, billDiscount: 0, cgst: 288, sgst: 288, roundOff: 24, total: 12100 },
  ...over,
})

const pay = (over: Partial<Payment>): Payment => ({
  id: 'p', billId: 'b1', mode: 'upi', amount: 0, paidAt: '', ...over,
})

describe('bill receipt', () => {
  const r = buildBillReceipt(makeBill(), { payments: [pay({ amount: 12100 })] })

  it('has the right lines', () => {
    expect(r.lines).toEqual([
      { name: 'Masala Chai', qty: 2, price: '90.00', details: ['Regular', '+ Extra Ginger'], discount: null },
      { name: 'Vada Pav', qty: 1, price: '25.00', details: ['Single'], discount: null },
    ])
  })
  it('totals equal the saved bill, with a signed Round off line', () => {
    const by = Object.fromEntries(r.totals.map((t) => [t.key, t]))
    expect(by.subtotal.amount).toBe(11500)
    expect(by.cgst.amount).toBe(288)
    expect(by.sgst.amount).toBe(288)
    expect(by.roundOff.amount).toBe(24)
    expect(by.roundOff.text).toBe('+0.24')
    expect(by.total.amount).toBe(12100)
    expect(by.total.text).toBe('₹121.00')
    expect(by.discount).toBeUndefined()
  })
  it('always shows Round off, even when zero', () => {
    const z = buildBillReceipt(makeBill({ totals: { ...makeBill().totals, roundOff: 0 } }))
    expect(z.totals.find((t) => t.key === 'roundOff')?.text).toBe('0.00')
  })
  it('shows Discount and a per-line discount when present', () => {
    const b = makeBill({
      lines: [{ ...chai, discount: { type: 'flat', value: 500 }, discountAmount: 500, lineTotal: 8500 }],
      totals: { ...makeBill().totals, itemDiscount: 500, billDiscount: 100 },
    })
    const d = buildBillReceipt(b)
    expect(d.lines[0].discount).toBe('Disc -5.00')
    expect(d.lines[0].price).toBe('85.00')
    expect(d.totals.find((t) => t.key === 'discount')?.text).toBe('-6.00')
  })
  it('has order type, token, bill number and formatted date', () => {
    expect(r.orderType).toBe('TAKEAWAY')
    expect(r.token).toBe(1)
    expect(r.dateTime).toBe('30-Oct-2026 14:32')
    expect(buildBillReceipt(makeBill({ orderType: 'dine-in' })).orderType).toBe('DINE-IN')
  })
  it('keeps a long item name whole', () => {
    const name = 'Extra Large Cheese Burst Grilled Vegetable Sandwich With Mint Chutney'
    expect(buildBillReceipt(makeBill({ lines: [{ ...vada, name }] })).lines[0].name).toBe(name)
    expect(buildKotReceipt(makeBill({ lines: [{ ...vada, name }] })).lines[0].name).toBe(name)
  })
})

describe('kot receipt', () => {
  const k = buildKotReceipt(makeBill())
  it('has the same lines and quantities, no prices', () => {
    expect(k.lines).toEqual([
      { name: 'Masala Chai', qty: 2, details: ['Regular', '+ Extra Ginger'] },
      { name: 'Vada Pav', qty: 1, details: ['Single'] },
    ])
    expect(JSON.stringify(k)).not.toMatch(/price|total|90\.00|customer|DUPLICATE/i)
  })
  it('has the order type and no duplicate stamp even after prints', () => {
    expect(k.orderType).toBe('TAKEAWAY')
    expect('duplicate' in buildKotReceipt(makeBill({ printCount: 3 }))).toBe(false)
  })
})

describe('payments', () => {
  const bill113 = makeBill({ totals: { ...makeBill().totals, total: 11300 } })
  it('split shows one line per mode', () => {
    const r = buildBillReceipt(bill113, {
      payments: [pay({ mode: 'cash', amount: 10000, cashReceived: 10000, changeDue: 0 }), pay({ mode: 'upi', amount: 1300 })],
    })
    expect(r.payments).toEqual(['Cash ₹100.00', 'UPI ₹13.00'])
    expect(r.statusText).toBe('PAID')
  })
  it('cash shows received and change', () => {
    const bill169 = makeBill({ totals: { ...makeBill().totals, total: 16900 } })
    const r = buildBillReceipt(bill169, { payments: [pay({ mode: 'cash', amount: 16900, cashReceived: 50000, changeDue: 33100 })] })
    expect(r.payments).toEqual(['Cash ₹169.00', 'Received ₹500.00', 'Change ₹331.00'])
  })
  it('no payments shows NO PAYMENT DUE, not PAID', () => {
    const r = buildBillReceipt(makeBill(), { payments: [] })
    expect(r.statusText).toBe('NO PAYMENT DUE')
    expect(r.paid).toBe(false)
    expect(r.payments).toEqual([])
  })
})

describe('customer line', () => {
  it('masks the phone', () => {
    expect(maskPhone('9876543210')).toBe('98•••••210')
    expect(buildBillReceipt(makeBill({ customerId: 'c1' }), { customer: { phone: '9876543210' } }).customer).toBe('98•••••210')
  })
  it('is omitted without a customer', () => {
    expect(buildBillReceipt(makeBill()).customer).toBeNull()
  })
})

describe('duplicate stamp', () => {
  it('printCount 0 has none, 1 stamps the bill', () => {
    expect(buildBillReceipt(makeBill({ printCount: 0 })).duplicate).toBe(false)
    expect(buildBillReceipt(makeBill({ printCount: 1 })).duplicate).toBe(true)
    expect(buildBillReceipt(makeBill({ printCount: 4 })).duplicate).toBe(true)
  })
})
