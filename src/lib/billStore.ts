import { readJSON, writeJSON } from './storage'
import { nextNumber } from './numbering'
import type { DayCounter } from './numbering'
import type { Bill, BillLine, Customer, BillTotals, OrderType, Payment, PaymentMode } from './types'
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
    printCount: 0,
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

// The only change ever made to a saved bill: count a started print job.
export function incrementPrintCount(billId: string): number {
  const bills = getBills()
  let count = 0
  writeJSON(
    KEYS.bills,
    bills.map((b) => {
      if (b.id !== billId) return b
      count = (b.printCount ?? 0) + 1
      return { ...b, printCount: count }
    }),
  )
  return count
}

export const getCustomer = (id: string | null) =>
  id ? (readJSON<Customer[]>('customers') ?? []).find((c) => c.id === id) ?? null : null

export const getAutoPrint = (): boolean => readJSON<boolean>('autoPrint') === true // default OFF
export const setAutoPrint = (on: boolean) => writeJSON('autoPrint', on)
