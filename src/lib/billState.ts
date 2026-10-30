import type { Discount } from './totals'
import type { OrderType, PaymentMode } from './types'

// Per-bill settings that must start fresh on every new bill.
// Only the default payment mode and the numbering counter carry over.
export interface BillDraft {
  orderType: OrderType
  billDiscount: Discount | null
  mode: PaymentMode | 'split'
  txnRef: string
}

export const freshDraft = (defaultMode: PaymentMode): BillDraft => ({
  orderType: 'takeaway',
  billDiscount: null,
  mode: defaultMode,
  txnRef: '',
})
