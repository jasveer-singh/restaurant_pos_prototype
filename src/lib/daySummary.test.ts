import { describe, expect, it } from 'vitest'
import { buildDaySummary } from './daySummary'
import type { Bill, BillLine, Payment, PaymentMode } from './types'

const line = (name: string, quantity: number, lineTotal: number): BillLine => ({
  itemId: name, name, variantName: null, addOnNames: [], quantity,
  unitPrice: lineTotal / quantity, discount: null, discountAmount: 0, lineTotal,
})

const bill = (
  id: string, at: Date, totals: Partial<Bill['totals']>, lines: BillLine[],
  customerId: string | null, billingMs: number,
): Bill => ({
  id, billNumber: id, token: 1, orderType: 'takeaway', cashier: 'Cashier 1', customerId,
  createdAt: at.toISOString(), status: 'completed', billingMs, printCount: 0, lines, billDiscount: null,
  totals: { subtotal: 0, itemDiscount: 0, billDiscount: 0, cgst: 0, sgst: 0, roundOff: 0, total: 0, ...totals },
})

const pay = (billId: string, mode: PaymentMode, amount: number, extra: Partial<Payment> = {}): Payment => ({
  id: `${billId}-${mode}`, billId, mode, amount, paidAt: '', ...extra,
})

const B1 = bill('B1', new Date(2026, 9, 30, 12, 0),
  { subtotal: 11500, cgst: 288, sgst: 288, roundOff: 24, total: 12100 },
  [line('Masala Chai', 2, 9000), line('Vada Pav', 1, 2500)], '9876543210', 18000)
const B2 = bill('B2', new Date(2026, 9, 30, 13, 0),
  { subtotal: 16000, cgst: 400, sgst: 400, roundOff: 0, total: 16800 },
  [line('Cold Coffee', 1, 14000), line('Samosa', 1, 2000)], null, 24000)
const B3 = bill('B3', new Date(2026, 9, 30, 14, 0),
  { subtotal: 10000, billDiscount: 1000, cgst: 225, sgst: 225, roundOff: 50, total: 9500 },
  [line('Vada Pav', 4, 10000)], '9123456780', 36000)
const earlier = bill('B0', new Date(2026, 9, 29, 11, 0),
  { subtotal: 4000, cgst: 100, sgst: 100, roundOff: 0, total: 4200 }, [line('Masala Chai', 1, 4000)], '9876543210', 10000)

const payments = [
  pay('B1', 'upi', 12100),
  pay('B2', 'cash', 16800, { cashReceived: 50000, changeDue: 33200 }),
  pay('B3', 'cash', 5000), pay('B3', 'upi', 4500),
  pay('B0', 'upi', 4200),
]
const all = [earlier, B1, B2, B3]

describe('buildDaySummary 2026-10-30', () => {
  const s = buildDaySummary(all, '2026-10-30', payments)

  it('reconciliation figures', () => {
    expect(s.bills).toBe(3)
    expect(s.grossSales).toBe(37500)
    expect(s.discounts).toBe(1000)
    expect(s.netSales).toBe(36500)
    expect(s.cgst).toBe(913)
    expect(s.sgst).toBe(913)
    expect(s.roundOff).toBe(74)
    expect(s.totalCollected).toBe(38400)
  })
  it('total collected equals the sum of bill totals and of payments', () => {
    expect(s.sumBillTotals).toBe(38400)
    expect(s.sumPayments).toBe(38400)
    expect(s.reconciled).toBe(true)
  })
  it('headline numbers', () => {
    expect(s.avgBillValue).toBe(12800)
    expect(s.avgBillingMs).toBe(26000)
    expect(s.discountPct).toBe(2.67)
    expect(s.discountedBills).toBe(1)
  })
  it('sales by mode use amounts settled, not cash handed over', () => {
    const by = Object.fromEntries(s.byMode.map((m) => [m.mode, m]))
    expect(by.upi).toMatchObject({ amount: 16600, count: 2 })
    expect(by.cash).toMatchObject({ amount: 21800, count: 2 })
    expect(by.card).toMatchObject({ amount: 0, count: 0 })
    expect(s.modeTotal).toBe(s.totalCollected)
  })
  it('top items by quantity, then revenue', () => {
    expect(s.topItems[0]).toEqual({ name: 'Vada Pav', quantity: 5, revenue: 12500 })
    expect(s.topItems[1]).toEqual({ name: 'Masala Chai', quantity: 2, revenue: 9000 })
    expect(s.topItems.map((t) => t.name)).toEqual(['Vada Pav', 'Masala Chai', 'Cold Coffee', 'Samosa'])
  })
  it('new, repeat and walk-in customers', () => {
    expect(s.customers.newIds).toEqual(['9123456780'])
    expect(s.customers.repeatIds).toEqual(['9876543210'])
    expect(s.customers.walkIn).toBe(1)
  })
  it('lists the days bills oldest first', () => {
    expect(s.rows.map((r) => r.billNumber)).toEqual(['B1', 'B2', 'B3'])
    expect(s.rows[2]).toMatchObject({ total: 9500, discount: 1000, billingMs: 36000 })
    expect(s.rows[2].payments).toEqual([{ mode: 'cash', amount: 5000 }, { mode: 'upi', amount: 4500 }])
  })
  it('is not empty', () => {
    expect(s.empty).toBe(false)
  })
})

describe('reconciliation warning', () => {
  it('flags payments that do not add up to the total', () => {
    expect(buildDaySummary(all, '2026-10-30', payments.filter((p) => p.id !== 'B1-upi')).reconciled).toBe(false)
  })
})

describe('day boundaries', () => {
  const late = bill('L', new Date(2026, 9, 30, 23, 59), { subtotal: 1000, total: 1000 }, [], null, 1000)
  const early = bill('E', new Date(2026, 9, 31, 0, 1), { subtotal: 2000, total: 2000 }, [], null, 1000)
  it('23:59 belongs to the 30th, 00:01 to the 31st', () => {
    expect(buildDaySummary([late, early], '2026-10-30').rows.map((r) => r.billNumber)).toEqual(['L'])
    expect(buildDaySummary([late, early], '2026-10-31').rows.map((r) => r.billNumber)).toEqual(['E'])
  })
})

describe('other rules', () => {
  it('ignores bills that are not completed', () => {
    const voided = { ...B1, id: 'V', status: 'void' } as unknown as Bill
    expect(buildDaySummary([voided], '2026-10-30').bills).toBe(0)
  })
  it('counts a zero-total bill in the bill count and the average', () => {
    const zero = bill('Z', new Date(2026, 9, 30, 15, 0), {}, [line('Chai', 1, 3000)], null, 5000)
    const s = buildDaySummary([B1, zero], '2026-10-30', [pay('B1', 'upi', 12100)])
    expect(s.bills).toBe(2)
    expect(s.avgBillValue).toBe(6050)
  })
  it('an empty day is all zeros with the empty flag', () => {
    const s = buildDaySummary(all, '2026-11-15', payments)
    expect(s.empty).toBe(true)
    expect(s).toMatchObject({ bills: 0, grossSales: 0, totalCollected: 0, avgBillValue: 0, avgBillingMs: 0, discountPct: 0 })
    expect(s.topItems).toEqual([])
    expect(s.reconciled).toBe(true)
  })
})
