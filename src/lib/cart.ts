import type { Discount } from './totals'

export interface CartLine {
  id: string
  itemId: string
  itemName: string
  variantId: string
  variantName: string
  showVariant: boolean
  addOnIds: string[]
  addOnNames: string[]
  unitPrice: number // paise
  quantity: number
  discount: Discount | null
}

// Same item + variant + add-ons = same line.
export const lineKey = (itemId: string, variantId: string, addOnIds: string[]): string =>
  [itemId, variantId, ...[...addOnIds].sort()].join('|')
