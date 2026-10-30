// Pure receipt view models. Everything comes from the saved bill (and its payments);
// nothing is recomputed. No UI code here.
import { formatRupees } from './money'
import { RESTAURANT } from './receiptConstants'
import type { Size } from './receiptConstants'
import type { Bill, Customer, Payment, PaymentMode } from './types'

const MODE_LABEL: Record<PaymentMode, string> = { upi: 'UPI', card: 'Card', cash: 'Cash' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const amt = (paise: number) => (Math.abs(paise) / 100).toFixed(2)
const signed = (paise: number) => (paise > 0 ? `+${amt(paise)}` : paise < 0 ? `-${amt(paise)}` : amt(0))
const pad2 = (n: number) => String(n).padStart(2, '0')

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${pad2(d.getDate())}-${MONTHS[d.getMonth()]}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

// 9876543210 -> 98•••••210
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 5) return digits
  return digits.slice(0, 2) + '•'.repeat(digits.length - 5) + digits.slice(-3)
}

const orderLabel = (bill: Bill) => (bill.orderType === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN')

export interface BillReceiptLine {
  name: string
  qty: number
  price: string // line total after item discount, no ₹
  details: string[] // variant, then "+ add-on" lines
  discount: string | null // "Disc -X.XX"
}

export interface ReceiptTotal {
  key: 'subtotal' | 'discount' | 'cgst' | 'sgst' | 'roundOff' | 'total'
  label: string
  amount: number // paise, as saved on the bill (negative for discount)
  text: string
  size: Size
  bold: boolean
}

export interface BillReceipt {
  duplicate: boolean
  header: { name: string; address: string; fssai: string; gstin: string }
  billNumber: string
  token: number
  orderType: string
  dateTime: string
  customer: string | null
  lines: BillReceiptLine[]
  totals: ReceiptTotal[]
  paid: boolean
  statusText: 'PAID' | 'NO PAYMENT DUE'
  payments: string[]
}

export function buildBillReceipt(
  bill: Bill,
  opts: { payments?: Payment[]; customer?: Pick<Customer, 'phone'> | null } = {},
): BillReceipt {
  const payments = opts.payments ?? []
  const t = bill.totals
  const discount = t.itemDiscount + t.billDiscount
  const totals: ReceiptTotal[] = [
    { key: 'subtotal', label: 'Subtotal', amount: t.subtotal, text: amt(t.subtotal), size: 'M', bold: false },
  ]
  if (discount > 0) {
    totals.push({ key: 'discount', label: 'Discount', amount: -discount, text: `-${amt(discount)}`, size: 'S', bold: false })
  }
  totals.push(
    { key: 'cgst', label: 'CGST 2.5%', amount: t.cgst, text: amt(t.cgst), size: 'S', bold: false },
    { key: 'sgst', label: 'SGST 2.5%', amount: t.sgst, text: amt(t.sgst), size: 'S', bold: false },
    { key: 'roundOff', label: 'Round off', amount: t.roundOff, text: signed(t.roundOff), size: 'S', bold: false },
    { key: 'total', label: 'Total', amount: t.total, text: formatRupees(t.total), size: 'L', bold: true },
  )

  const lines = bill.lines.map((l) => ({
    name: l.name,
    qty: l.quantity,
    price: amt(l.lineTotal),
    details: [...(l.variantName ? [l.variantName] : []), ...l.addOnNames.map((a) => `+ ${a}`)],
    discount: l.discountAmount > 0 ? `Disc -${amt(l.discountAmount)}` : null,
  }))

  // Received/Change only for a cash-only bill: split parts are exactly what was paid.
  const payLines = payments.map((p) => `${MODE_LABEL[p.mode]} ${formatRupees(p.amount)}`)
  if (payments.length === 1 && payments[0].mode === 'cash') {
    const p = payments[0]
    payLines.push(`Received ${formatRupees(p.cashReceived ?? p.amount)}`, `Change ${formatRupees(p.changeDue ?? 0)}`)
  }

  const paid = payments.length > 0
  return {
    duplicate: (bill.printCount ?? 0) >= 1,
    header: {
      name: RESTAURANT.name,
      address: RESTAURANT.address,
      fssai: `FSSAI: ${RESTAURANT.fssai}`,
      gstin: `GSTIN: ${RESTAURANT.gstin}`,
    },
    billNumber: bill.billNumber,
    token: bill.token,
    orderType: orderLabel(bill),
    dateTime: formatDateTime(bill.createdAt),
    customer: bill.customerId && opts.customer ? maskPhone(opts.customer.phone) : null,
    lines,
    totals,
    paid,
    statusText: paid ? 'PAID' : 'NO PAYMENT DUE',
    payments: payLines,
  }
}

export interface KotReceipt {
  token: number
  orderType: string
  billNumber: string
  dateTime: string
  lines: { name: string; qty: number; details: string[] }[]
}

// No prices, totals, customer details or duplicate stamp on the KOT.
export function buildKotReceipt(bill: Bill): KotReceipt {
  return {
    token: bill.token,
    orderType: orderLabel(bill),
    billNumber: bill.billNumber,
    dateTime: formatDateTime(bill.createdAt),
    lines: bill.lines.map((l) => ({
      name: l.name,
      qty: l.quantity,
      details: [...(l.variantName ? [l.variantName] : []), ...l.addOnNames.map((a) => `+ ${a}`)],
    })),
  }
}
