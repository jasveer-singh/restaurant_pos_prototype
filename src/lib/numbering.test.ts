import { describe, expect, it } from 'vitest'
import { nextNumber } from './numbering'

const oct30 = new Date(2026, 9, 30, 12)
const oct31 = new Date(2026, 9, 31, 9)

describe('nextNumber', () => {
  it('starts at 1 with no counter', () => {
    const n = nextNumber(null, oct30)
    expect(n.token).toBe(1)
    expect(n.billNumber).toBe('3010260001')
    expect(n.counter).toEqual({ date: '2026-10-30', last: 1 })
  })
  it('increments on the same date', () => {
    const n = nextNumber({ date: '2026-10-30', last: 57 }, oct30)
    expect(n.token).toBe(58)
    expect(n.billNumber).toBe('3010260058')
  })
  it('resets on a new local day', () => {
    const n = nextNumber({ date: '2026-10-30', last: 57 }, oct31)
    expect(n.token).toBe(1)
    expect(n.billNumber).toBe('3110260001')
  })
  it('token 999 at counter 999', () => {
    const n = nextNumber({ date: '2026-10-30', last: 998 }, oct30)
    expect(n.token).toBe(999)
    expect(n.billNumber).toBe('3010260999')
  })
  it('token wraps to 1 at counter 1000', () => {
    const n = nextNumber({ date: '2026-10-30', last: 999 }, oct30)
    expect(n.token).toBe(1)
    expect(n.billNumber.endsWith('1000')).toBe(true)
  })
})
