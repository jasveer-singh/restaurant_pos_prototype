// Receipt font sizes in px, shared by the receipt components.
export type Size = 'S' | 'M' | 'L' | 'XL'

export const FONT_PX: Record<Size, number> = { S: 12, M: 16, L: 20, XL: 28 }

// Placeholder outlet details printed on the bill.
export const RESTAURANT = {
  name: 'Chai & Co.',
  address: '12 Sample Street, Mumbai 400001',
  fssai: '11111111111111 (sample)',
  gstin: '27AAAAA0000A1Z5 (sample)',
}
