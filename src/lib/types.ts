import type { Discount } from './totals'

export interface MenuMeta {
  restaurant: string
  currency: string
  pricesIncludeTax: boolean
  gstRatePercent: number
  cgstRatePercent: number
  sgstRatePercent: number
}

export interface Category {
  id: string
  name: string
  sortOrder: number
}

export interface Variant {
  id: string
  name: string
  price: number
}

export interface AddOnOption {
  id: string
  name: string
  price: number
}

export interface AddOnGroup {
  id: string
  name: string
  maxSelect: number
  options: AddOnOption[]
}

export interface Item {
  id: string
  code: string
  name: string
  categoryId: string
  isVeg: boolean
  isBestSeller: boolean
  station: string
  variants: Variant[]
  addOnGroupIds: string[]
}

export interface Customer {
  id: string // the normalised 10-digit phone
  phone: string
  createdAt: string
}

export type OrderType = 'takeaway' | 'dine-in'

export type PaymentMode = 'upi' | 'card' | 'cash'

// Snapshot of a cart line at settle time. Money in paise.
export interface BillLine {
  itemId: string
  name: string
  variantName: string | null
  addOnNames: string[]
  quantity: number
  unitPrice: number
  discount: Discount | null
  discountAmount: number
  lineTotal: number // after the item discount
}

export interface BillTotals {
  subtotal: number
  itemDiscount: number
  billDiscount: number
  cgst: number
  sgst: number
  roundOff: number
  total: number
}

export interface Bill {
  id: string
  billNumber: string
  token: number
  orderType: OrderType
  cashier: string
  customerId: string | null
  createdAt: string
  status: 'completed'
  billingMs: number
  printCount: number // print jobs started for this bill
  lines: BillLine[]
  billDiscount: Discount | null
  totals: BillTotals
}

// One record per mode used. `amount` is the part of the bill it settled (never includes change).
export interface Payment {
  id: string
  billId: string
  mode: PaymentMode
  amount: number // paise
  reference?: string
  cashReceived?: number // paise, cash only
  changeDue?: number // paise, cash only
  paidAt: string
}
