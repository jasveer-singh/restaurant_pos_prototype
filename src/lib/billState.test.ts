import { describe, expect, it } from 'vitest'
import { freshDraft } from './billState'

describe('freshDraft', () => {
  it('starts Takeaway with no bill discount, no txn ref and the default mode', () => {
    expect(freshDraft('upi')).toEqual({ orderType: 'takeaway', billDiscount: null, mode: 'upi', txnRef: '' })
  })
  it('uses the saved default mode', () => {
    expect(freshDraft('card').mode).toBe('card')
  })
  it('returns independent objects', () => {
    expect(freshDraft('upi')).not.toBe(freshDraft('upi'))
  })
})
