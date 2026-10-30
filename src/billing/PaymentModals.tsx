import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { formatRupees } from '../lib/money'
import { cashChange, quickCashAmounts, validateSplit } from '../lib/payments'
import { getCustomer } from '../lib/billStore'
import { buildBillReceipt, buildKotReceipt } from '../lib/receipts'
import type { Bill, Payment, PaymentMode } from '../lib/types'
import { BillReceiptView, KotReceiptView } from './Receipt'

const MODE_LABEL: Record<PaymentMode, string> = { upi: 'UPI', card: 'Card', cash: 'Cash' }
export { MODE_LABEL }

const digits = (s: string) => s.replace(/\D/g, '')

// Shift+Enter triggers the modal's own Settle (when it is enabled).
function useShiftEnter(enabled: boolean, fn: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey && enabled) {
        e.preventDefault()
        fn()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })
}

export function QrModal({ total, onClose }: { total: number; onClose: () => void }) {
  const uri = `upi://pay?pa=chaico@mockbank&pn=${encodeURIComponent('Chai & Co.')}&am=${(total / 100).toFixed(2)}&cu=INR`
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal qr" onClick={(e) => e.stopPropagation()}>
        <h2>UPI · {formatRupees(total)}</h2>
        <QRCodeSVG value={uri} size={220} />
        <p className="hint">Mock QR, no real payment</p>
        <div className="actions">
          <button className="btn primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export function CashModal({
  total,
  onSettle,
  onClose,
}: {
  total: number
  onSettle: (receivedPaise: number) => void
  onClose: () => void
}) {
  const totalR = total / 100
  const [text, setText] = useState('')
  const received = text === '' ? NaN : Number(text)
  const { valid, change } = cashChange(totalR, received)
  const settle = () => valid && onSettle(received * 100)
  useShiftEnter(valid, settle)

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Cash · {formatRupees(total)}</h2>
        <label className="lbl">Amount received</label>
        <input
          className="field"
          inputMode="numeric"
          autoFocus
          value={text}
          onChange={(e) => setText(digits(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && settle()}
        />
        <div className="chips quick">
          {quickCashAmounts(totalR).map((a, i) => (
            <button key={a} className="chip" onClick={() => setText(String(a))}>
              {i === 0 ? 'Exact' : `₹${a}`}
            </button>
          ))}
        </div>
        <div className="change">
          <span>Change due</span>
          <strong>{valid ? formatRupees(change * 100) : '—'}</strong>
        </div>
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid} onClick={settle}>Settle</button>
        </div>
      </div>
    </div>
  )
}

export interface SplitPart {
  mode: PaymentMode
  amount: number // paise
  reference?: string
}

export function SplitModal({
  total,
  onSettle,
  onClose,
}: {
  total: number
  onSettle: (parts: SplitPart[]) => void
  onClose: () => void
}) {
  const totalR = total / 100
  const modes: PaymentMode[] = ['upi', 'card', 'cash']
  const [amounts, setAmounts] = useState<Record<PaymentMode, string>>({ upi: '', card: '', cash: '' })
  const [refs, setRefs] = useState<Record<PaymentMode, string>>({ upi: '', card: '', cash: '' })
  const num = (m: PaymentMode) => (amounts[m] === '' ? 0 : Number(amounts[m]))
  const { valid, remaining } = validateSplit(totalR, { upi: num('upi'), card: num('card'), cash: num('cash') })

  const settle = () => {
    if (!valid) return
    onSettle(
      modes
        .filter((m) => num(m) > 0)
        .map((m) => ({ mode: m, amount: num(m) * 100, reference: m === 'cash' ? undefined : refs[m] || undefined })),
    )
  }
  useShiftEnter(valid, settle)

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Split · {formatRupees(total)}</h2>
        {modes.map((m, i) => (
          <div key={m} className="split-row">
            <label className="lbl">{MODE_LABEL[m]}</label>
            <input
              className="field"
              inputMode="numeric"
              autoFocus={i === 0}
              placeholder="0"
              value={amounts[m]}
              onChange={(e) => setAmounts({ ...amounts, [m]: digits(e.target.value) })}
            />
            <button className="link" onClick={() => setAmounts({ ...amounts, [m]: String(Math.max(0, num(m) + remaining)) })}>
              Fill remaining
            </button>
            {m !== 'cash' && (
              <div className="ref-wrap">
                <label className="lbl" htmlFor={`ref-${m}`}>Txn ref (last 4)</label>
                <input
                  id={`ref-${m}`}
                  className="field ref"
                  inputMode="numeric"
                  maxLength={4}
                  value={refs[m]}
                  onChange={(e) => setRefs({ ...refs, [m]: digits(e.target.value).slice(0, 4) })}
                />
              </div>
            )}
          </div>
        ))}
        <div className="change">
          <span>Remaining</span>
          <strong className={remaining === 0 ? 'ok' : 'bad'}>{formatRupees(remaining * 100)}</strong>
        </div>
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid} onClick={settle}>Settle</button>
        </div>
      </div>
    </div>
  )
}

export function SettledSummary({
  bill,
  payments,
  autoPrint,
  onAutoPrint,
  onReprint,
  onView,
  onNewBill,
}: {
  bill: Bill
  payments: Payment[]
  autoPrint: boolean
  onAutoPrint: (on: boolean) => void
  onReprint: () => void
  onView: () => void
  onNewBill: () => void
}) {
  const [showBill, setShowBill] = useState(false)
  const [showKot, setShowKot] = useState(false)
  const change = payments.reduce((s, p) => s + (p.changeDue ?? 0), 0)
  const cashOnly = payments.length === 1 && payments[0].mode === 'cash' // no change calculation in split
  return (
    <div className="settled">
      <p className="settled-line">Settled · {formatRupees(bill.totals.total)}</p>
      {cashOnly && <div className="settled-change">Change due {formatRupees(change)}</div>}
      <div className="settled-token">Token {bill.token}</div>
      {payments.length === 0 ? (
        <p className="settled-modes">No payment due</p>
      ) : (
        <dl className="settled-modes">
          {payments.map((p) => (
            <Row key={p.id} label={`Collected · ${MODE_LABEL[p.mode]}`} value={formatRupees(p.amount)} />
          ))}
        </dl>
      )}
      <p className="settled-time">Billed in {(bill.billingMs / 1000).toFixed(1)} s</p>
      <label className="auto-print">
        <input type="checkbox" checked={autoPrint} onChange={(e) => onAutoPrint(e.target.checked)} />
        Auto-print on settle
      </label>
      <div className="print-actions">
        <button className="btn" onClick={onReprint}>Reprint</button>
        <button className="btn" onClick={onView}>View bill &amp; KOT</button>
        <button className={'btn' + (showBill ? ' on' : '')} onClick={() => setShowBill(!showBill)}>Preview bill</button>
        <button className={'btn' + (showKot ? ' on' : '')} onClick={() => setShowKot(!showKot)}>Preview KOT</button>
      </div>
      {showBill && (
        <div className="preview">
          <BillReceiptView data={buildBillReceipt(bill, { payments, customer: getCustomer(bill.customerId) })} />
        </div>
      )}
      {showKot && (
        <div className="preview">
          <KotReceiptView data={buildKotReceipt(bill)} />
        </div>
      )}
      <button className="btn primary new-bill" onClick={onNewBill}>New bill</button>
    </div>
  )
}

export function ReceiptsModal({
  bill,
  payments,
  onPrint,
  onClose,
}: {
  bill: Bill
  payments: Payment[]
  onPrint: () => void
  onClose: () => void
}) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal receipts-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Bill &amp; KOT</h2>
        <div className="receipts-scroll">
          <div className="preview">
            <BillReceiptView data={buildBillReceipt(bill, { payments, customer: getCustomer(bill.customerId) })} />
          </div>
          <div className="preview">
            <KotReceiptView data={buildKotReceipt(bill)} />
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn primary" onClick={onPrint}>
            {(bill.printCount ?? 0) >= 1 ? 'Reprint' : 'Print bill + KOT'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}
