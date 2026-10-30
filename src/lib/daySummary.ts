// Day summary, computed from saved bills and their payments. Pure: nothing is stored.
//
// What the saved bill's totals mean (written by totals.ts at settle, all in paise):
//   subtotal     sum of line totals before any discount
//   itemDiscount discounts applied to individual lines
//   billDiscount bill-level discount, taken off what remains after item discounts
//   cgst / sgst  2.5% each of (subtotal - itemDiscount - billDiscount), rounded separately
//   roundOff     adjustment to the nearest whole rupee (total - (net + cgst + sgst))
//   total        whole rupees; equals net sales + cgst + sgst + roundOff
import { localDateKey } from './numbering'
import type { Bill, Payment, PaymentMode } from './types'

const MODES: PaymentMode[] = ['upi', 'card', 'cash']

export interface ModeTotal {
  mode: PaymentMode
  amount: number // paise
  count: number
}

export interface TopItem {
  name: string
  quantity: number
  revenue: number // line total after item-level discount; bill discount is not allocated
}

export interface DayBillRow {
  id: string
  billNumber: string
  createdAt: string
  orderType: Bill['orderType']
  customerId: string | null
  total: number
  payments: { mode: PaymentMode; amount: number }[]
  discount: number
  billingMs: number
}

export interface DaySummary {
  dateKey: string
  empty: boolean
  bills: number
  grossSales: number
  discounts: number
  netSales: number
  cgst: number
  sgst: number
  roundOff: number
  totalCollected: number // net sales + taxes + round-off
  sumBillTotals: number
  sumPayments: number
  reconciled: boolean // totalCollected equals both the bill totals and the payments
  avgBillValue: number // paise, rounded
  avgBillingMs: number
  discountPct: number // discounts as % of gross, 2 decimals
  discountedBills: number
  byMode: ModeTotal[]
  modeTotal: number
  topItems: TopItem[]
  customers: { newIds: string[]; repeatIds: string[]; walkIn: number }
  rows: DayBillRow[]
}

const billDate = (b: Bill) => localDateKey(new Date(b.createdAt))
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

export function buildDaySummary(bills: Bill[], dateKey: string, payments: Payment[] = []): DaySummary {
  const completed = bills.filter((b) => b.status === 'completed')
  const day = completed
    .filter((b) => billDate(b) === dateKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const ids = new Set(day.map((b) => b.id))
  const dayPayments = payments.filter((p) => ids.has(p.billId))

  const grossSales = sum(day.map((b) => b.totals.subtotal))
  const discounts = sum(day.map((b) => b.totals.itemDiscount + b.totals.billDiscount))
  const netSales = grossSales - discounts
  const cgst = sum(day.map((b) => b.totals.cgst))
  const sgst = sum(day.map((b) => b.totals.sgst))
  const roundOff = sum(day.map((b) => b.totals.roundOff))
  const totalCollected = netSales + cgst + sgst + roundOff
  const sumBillTotals = sum(day.map((b) => b.totals.total))
  const sumPayments = sum(dayPayments.map((p) => p.amount))

  const byMode = MODES.map((mode) => {
    const ps = dayPayments.filter((p) => p.mode === mode)
    return { mode, amount: sum(ps.map((p) => p.amount)), count: ps.length }
  })

  const items = new Map<string, TopItem>()
  for (const b of day) {
    for (const l of b.lines) {
      const cur = items.get(l.name) ?? { name: l.name, quantity: 0, revenue: 0 }
      cur.quantity += l.quantity
      cur.revenue += l.lineTotal
      items.set(l.name, cur)
    }
  }
  const topItems = [...items.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name))
    .slice(0, 5)

  // New = no completed bill before this date; repeat = had earlier bills.
  const dayCustomers = [...new Set(day.map((b) => b.customerId).filter((c): c is string => !!c))]
  const hadEarlier = (id: string) => completed.some((b) => b.customerId === id && billDate(b) < dateKey)

  return {
    dateKey,
    empty: day.length === 0,
    bills: day.length,
    grossSales,
    discounts,
    netSales,
    cgst,
    sgst,
    roundOff,
    totalCollected,
    sumBillTotals,
    sumPayments,
    reconciled: totalCollected === sumBillTotals && totalCollected === sumPayments,
    avgBillValue: day.length ? Math.round(totalCollected / day.length) : 0,
    avgBillingMs: day.length ? sum(day.map((b) => b.billingMs)) / day.length : 0,
    discountPct: grossSales ? Math.round((discounts / grossSales) * 10000) / 100 : 0,
    discountedBills: day.filter((b) => b.totals.itemDiscount + b.totals.billDiscount > 0).length,
    byMode,
    modeTotal: sum(byMode.map((m) => m.amount)),
    topItems,
    customers: {
      newIds: dayCustomers.filter((c) => !hadEarlier(c)),
      repeatIds: dayCustomers.filter(hadEarlier),
      walkIn: day.filter((b) => !b.customerId).length,
    },
    rows: day.map((b) => ({
      id: b.id,
      billNumber: b.billNumber,
      createdAt: b.createdAt,
      orderType: b.orderType,
      customerId: b.customerId,
      total: b.totals.total,
      payments: dayPayments
        .filter((p) => p.billId === b.id)
        .map((p) => ({ mode: p.mode, amount: p.amount })),
      discount: b.totals.itemDiscount + b.totals.billDiscount,
      billingMs: b.billingMs,
    })),
  }
}
