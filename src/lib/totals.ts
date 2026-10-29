// Pure billing maths. All money is integer paise; no UI or storage code here.

export type Discount =
  | { type: 'percent'; value: number } // value is a percentage, e.g. 10 = 10%
  | { type: 'flat'; value: number } // value is paise

export interface TotalsLine {
  unitPrice: number // paise: variant + add-ons, per unit
  quantity: number
  discount?: Discount | null
}

export interface Totals {
  subtotal: number // sum of line totals before any discount
  itemDiscount: number
  billDiscount: number
  discount: number // itemDiscount + billDiscount
  taxable: number // subtotal - discount
  cgst: number
  sgst: number
  roundOff: number
  total: number // whole rupees, in paise
}

const CGST_BP = 250 // 2.5% in basis points
const SGST_BP = 250

// amount * percent / 100, rounded half-up to the nearest paise, in integer maths.
function percentOf(amount: number, percent: number): number {
  const bp = Math.round(percent * 100)
  return Math.floor((amount * bp + 5000) / 10000)
}

// Discount in paise, never more than `base` and never negative.
export function discountAmount(base: number, discount?: Discount | null): number {
  if (!discount || !(discount.value > 0) || base <= 0) return 0
  const raw = discount.type === 'percent' ? percentOf(base, discount.value) : Math.round(discount.value)
  return Math.min(Math.max(raw, 0), base)
}

export function lineGross(line: TotalsLine): number {
  return line.unitPrice * line.quantity
}

export function lineNet(line: TotalsLine): number {
  const gross = lineGross(line)
  return gross - discountAmount(gross, line.discount)
}

export function calculateTotals(lines: TotalsLine[], billDiscount?: Discount | null): Totals {
  const subtotal = lines.reduce((sum, l) => sum + lineGross(l), 0)
  const afterItem = lines.reduce((sum, l) => sum + lineNet(l), 0)
  const itemDiscount = subtotal - afterItem
  const billDisc = discountAmount(afterItem, billDiscount)
  const taxable = afterItem - billDisc
  const cgst = percentOf(taxable, CGST_BP / 100)
  const sgst = percentOf(taxable, SGST_BP / 100)
  const exact = taxable + cgst + sgst
  const total = Math.floor((exact + 50) / 100) * 100
  return {
    subtotal,
    itemDiscount,
    billDiscount: billDisc,
    discount: itemDiscount + billDisc,
    taxable,
    cgst,
    sgst,
    roundOff: total - exact,
    total,
  }
}
