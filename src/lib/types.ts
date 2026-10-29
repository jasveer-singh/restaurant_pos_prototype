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
  id: string
  name: string
  phone: string
}

export interface BillLine {
  id: string
  itemId: string
  itemName: string
  variantId: string
  variantName: string
  addOnIds: string[]
  addOnNames: string[]
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type PaymentMethod = 'cash' | 'card' | 'upi'

export interface Payment {
  id: string
  method: PaymentMethod
  amount: number
  paidAt: string
}

export type OrderType = 'takeaway' | 'dine-in'

export type BillStatus = 'open' | 'paid' | 'void'

export interface Bill {
  id: string
  number: number
  createdAt: string
  status: BillStatus
  orderType: OrderType
  lines: BillLine[]
  customerId?: string
  payments: Payment[]
  subtotal: number
  cgst: number
  sgst: number
  total: number
}
