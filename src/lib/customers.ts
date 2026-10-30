// Customer capture and repeat-order logic. Pure: no UI or storage code here.
import { lineKey } from './cart'
import type { CartLine } from './cart'
import { toPaise } from './money'
import type { AddOnGroup, Bill, Customer, Item } from './types'

export interface NormalizedPhone {
  phone: string // digits after stripping +91 / 91 / 0 (may be partial while typing)
  valid: boolean // exactly 10 digits starting 6-9
}

export function normalizePhone(input: string): NormalizedPhone {
  const raw = input.trim()
  let digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+91')) digits = digits.slice(2)
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return { phone: digits, valid: /^[6-9]\d{9}$/.test(digits) }
}

// From 3 digits on: up to 5 customers whose phone contains the digits, end-of-number matches first.
export function searchCustomers(customers: Customer[], query: string): Customer[] {
  const q = normalizePhone(query).phone
  if (q.length < 3) return []
  const hits = customers.filter((c) => c.phone.includes(q))
  return [...hits.filter((c) => c.phone.endsWith(q)), ...hits.filter((c) => !c.phone.endsWith(q))].slice(0, 5)
}

export function lastOrders(bills: Bill[], customerId: string, n: number): Bill[] {
  return bills
    .filter((b) => b.customerId === customerId && b.status === 'completed')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, n)
}

// "2× Masala Chai, 1× Vada Pav"
export const orderSummary = (bill: Bill): string =>
  bill.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')

export interface Menu {
  items: Item[]
  addOnGroups: AddOnGroup[]
}

export interface RepeatResult {
  lines: CartLine[]
  skipped: string[] // names of lines that could not be repeated
}

// Rebuilds an old bill's lines against the current menu: same variant, add-ons and quantity,
// re-priced from today's prices. Discounts are never carried over.
export function repeatLines(bill: Bill, menu: Menu): RepeatResult {
  const lines: CartLine[] = []
  const skipped: string[] = []
  for (const l of bill.lines) {
    const item = menu.items.find((i) => i.id === l.itemId)
    if (!item) {
      skipped.push(l.name)
      continue
    }
    // variantName is null on the bill when the item had a single variant
    const variant = l.variantName
      ? item.variants.find((v) => v.name === l.variantName)
      : item.variants.length === 1
        ? item.variants[0]
        : undefined
    if (!variant) {
      skipped.push(`${l.name} (${l.variantName ?? 'variant'})`)
      continue
    }
    const options = menu.addOnGroups.filter((g) => item.addOnGroupIds.includes(g.id)).flatMap((g) => g.options)
    const addOns = l.addOnNames.map((n) => options.find((o) => o.name === n))
    const missing = l.addOnNames.filter((_, i) => !addOns[i])
    if (missing.length > 0) {
      skipped.push(`${l.name} (${missing.join(', ')})`)
      continue
    }
    const found = addOns.filter((o): o is NonNullable<typeof o> => !!o)
    const addOnIds = found.map((o) => o.id)
    lines.push({
      id: lineKey(item.id, variant.id, addOnIds),
      itemId: item.id,
      itemName: item.name,
      variantId: variant.id,
      variantName: variant.name,
      showVariant: item.variants.length > 1,
      addOnIds,
      addOnNames: found.map((o) => o.name),
      unitPrice: toPaise(variant.price) + found.reduce((s, o) => s + toPaise(o.price), 0),
      quantity: l.quantity,
      discount: null,
    })
  }
  return { lines, skipped }
}

// Adds new lines to the cart; the same configuration increases the existing line's quantity.
export function mergeLines(cartLines: CartLine[], newLines: CartLine[]): CartLine[] {
  const out = cartLines.map((l) => ({ ...l }))
  for (const n of newLines) {
    const existing = out.find((l) => l.id === n.id)
    if (existing) existing.quantity += n.quantity
    else out.push({ ...n })
  }
  return out
}
