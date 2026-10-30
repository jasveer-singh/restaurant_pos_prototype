import { readJSON, writeJSON } from './storage'
import { nextNumber } from './numbering'
import type { DayCounter } from './numbering'
import type { Bill, BillLine, BillTotals, OrderType, Payment, PaymentMode } from './types'
import type { Discount } from './totals'

// localStorage keys (prefixed "chaico:" by storage.ts)
const KEYS = {
  bills: 'bills',
  payments: 'payments',
  counter: 'billCounter',
  defaultMode: 'defaultPayMode',
} as const

export const getBills = () => readJSON<Bill[]>(KEYS.bills) ?? []
export const getPayments = () => readJSON<Payment[]>(KEYS.payments) ?? []

export function getDefaultMode(): PaymentMode {
  const m = readJSON<PaymentMode>(KEYS.defaultMode)
  return m === 'card' || m === 'cash' || m === 'upi' ? m : 'upi'
}
export const setDefaultMode = (m: PaymentMode) => writeJSON(KEYS.defaultMode, m)

export interface PaymentInput {
  mode: PaymentMode
  amount: number // paise, the part of the bill settled
  reference?: string
  cashReceived?: number // paise
}

export interface SaveBillInput {
  orderType: OrderType
  lines: BillLine[]
  billDiscount: Discount | null
  totals: BillTotals
  billingMs: number
  payments: PaymentInput[]
}

const uid = () => crypto.randomUUID()

// Completed bills are append-only: there is no update or delete path.
export function saveBill(input: SaveBillInput): { bill: Bill; payments: Payment[] } {
  const now = new Date()
  const num = nextNumber(readJSON<DayCounter>(KEYS.counter), now)
  const bill: Bill = {
    id: uid(),
    billNumber: num.billNumber,
    token: num.token,
    orderType: input.orderType,
    cashier: 'Cashier 1',
    customerId: null,
    createdAt: now.toISOString(),
    status: 'completed',
    billingMs: input.billingMs,
    lines: input.lines,
    billDiscount: input.billDiscount,
    totals: input.totals,
  }
  const payments: Payment[] = input.payments.map((p) => {
    const rec: Payment = { id: uid(), billId: bill.id, mode: p.mode, amount: p.amount, paidAt: bill.createdAt }
    if (p.reference) rec.reference = p.reference
    if (p.mode === 'cash') {
      rec.cashReceived = p.cashReceived ?? p.amount
      rec.changeDue = rec.cashReceived - p.amount
    }
    return rec
  })
  writeJSON(KEYS.payments, [...getPayments(), ...payments])
  writeJSON(KEYS.bills, [...getBills(), bill])
  writeJSON(KEYS.counter, num.counter)
  return { bill, payments }
}
