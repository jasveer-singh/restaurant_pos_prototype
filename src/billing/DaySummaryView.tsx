import { useEffect, useMemo, useState } from 'react'
import { buildDaySummary } from '../lib/daySummary'
import { formatRupees } from '../lib/money'
import { localDateKey } from '../lib/numbering'
import { maskPhone } from '../lib/receipts'
import type { Bill, Payment } from '../lib/types'

const MODE_LABEL = { upi: 'UPI', card: 'Card', cash: 'Cash' } as const
const pad2 = (n: number) => String(n).padStart(2, '0')
const timeOf = (iso: string) => {
  const d = new Date(iso)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`

export default function DaySummaryView({ bills, payments, onClose }: { bills: Bill[]; payments: Payment[]; onClose: () => void }) {
  const [dateKey, setDateKey] = useState(() => localDateKey(new Date())) // opens on today
  const s = useMemo(() => buildDaySummary(bills, dateKey, payments), [bills, payments, dateKey])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const recon: [string, number][] = [
    ['Gross sales', s.grossSales],
    ['Discounts', -s.discounts],
    ['Net sales', s.netSales],
    ['CGST', s.cgst],
    ['SGST', s.sgst],
    ['Round-off', s.roundOff],
  ]

  return (
    <div className="day">
      <header className="day-head">
        <h1>Day summary</h1>
        <input type="date" className="field" value={dateKey} onChange={(e) => e.target.value && setDateKey(e.target.value)} />
        <button className="btn" onClick={onClose}>Close</button>
      </header>

      {s.empty ? (
        <p className="day-empty">No bills on this date</p>
      ) : (
        <div className="day-body">
          <div className="stats">
            <div><span>Bills</span><strong>{s.bills}</strong></div>
            <div><span>Total collected</span><strong>{formatRupees(s.totalCollected)}</strong></div>
            <div><span>Average bill</span><strong>{formatRupees(s.avgBillValue)}</strong></div>
            <div><span>Avg billing time</span><strong>{secs(s.avgBillingMs)}</strong></div>
            <div><span>Discounts of gross</span><strong>{s.discountPct.toFixed(2)}%</strong></div>
            <div><span>Bills with discount</span><strong>{s.discountedBills}</strong></div>
          </div>

          <div className="day-grid">
            <section>
              <h2>Reconciliation</h2>
              <dl className="kv">
                {recon.map(([k, v]) => (
                  <Pair key={k} k={k} v={v < 0 ? `−${formatRupees(-v)}` : formatRupees(v)} bold={k === 'Net sales'} />
                ))}
                <Pair k="Total collected" v={formatRupees(s.totalCollected)} bold />
              </dl>
              {s.reconciled ? (
                <p className="ok">✓ Matches the sum of bill totals and payments</p>
              ) : (
                <p className="warn">
                  ⚠ Does not match: total collected {formatRupees(s.totalCollected)}, bill totals {formatRupees(s.sumBillTotals)}, payments {formatRupees(s.sumPayments)}
                </p>
              )}
            </section>

            <section>
              <h2>Sales by payment mode</h2>
              <dl className="kv">
                {s.byMode.map((m) => (
                  <Pair key={m.mode} k={`${MODE_LABEL[m.mode]} (${m.count})`} v={formatRupees(m.amount)} />
                ))}
                <Pair k="Total" v={formatRupees(s.modeTotal)} bold />
              </dl>
            </section>

            <section>
              <h2>Top 5 items</h2>
              <table className="mini">
                <tbody>
                  {s.topItems.map((t) => (
                    <tr key={t.name}><td>{t.name}</td><td>{t.quantity}</td><td>{formatRupees(t.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h2>Customers</h2>
              <dl className="kv">
                <Pair k="New" v={String(s.customers.newIds.length)} />
                <Pair k="Repeat" v={String(s.customers.repeatIds.length)} />
                <Pair k="Walk-in bills" v={String(s.customers.walkIn)} />
              </dl>
            </section>
          </div>

          <h2>Bills</h2>
          <div className="bills-scroll">
            <table className="bills">
              <thead>
                <tr><th>Bill</th><th>Time</th><th>Type</th><th>Customer</th><th>Total</th><th>Paid</th><th>Discount</th><th>Billing</th></tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.billNumber}</td>
                    <td>{timeOf(r.createdAt)}</td>
                    <td>{r.orderType === 'takeaway' ? 'Takeaway' : 'Dine-in'}</td>
                    <td>{r.customerId ? maskPhone(r.customerId) : '—'}</td>
                    <td>{formatRupees(r.total)}</td>
                    <td>{r.payments.length ? r.payments.map((p) => `${MODE_LABEL[p.mode]} ${formatRupees(p.amount)}`).join(', ') : 'No payment due'}</td>
                    <td>{r.discount > 0 ? formatRupees(r.discount) : '—'}</td>
                    <td>{secs(r.billingMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Pair({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <>
      <dt className={bold ? 'b' : ''}>{k}</dt>
      <dd className={bold ? 'b' : ''}>{v}</dd>
    </>
  )
}
