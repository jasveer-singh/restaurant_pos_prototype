import { useMemo, useState } from 'react'
import { formatRupees } from '../lib/money'
import { lastOrders, normalizePhone, orderSummary, searchCustomers } from '../lib/customers'
import { formatDateTime, maskPhone } from '../lib/receipts'
import type { Bill, Customer, Payment } from '../lib/types'

const MODE_LABEL = { upi: 'UPI', card: 'Card', cash: 'Cash' } as const

interface Props {
  customers: Customer[]
  bills: Bill[]
  payments: Payment[]
  attached: string | null // normalised phone
  text: string
  onText: (t: string) => void
  onAttach: (phone: string) => void
  onDetach: () => void
  onRepeat: (bill: Bill) => void
  notice: string | null
  disabled: boolean
}

export default function CustomerPanel({ customers, bills, payments, attached, text, onText, onAttach, onDetach, onRepeat, notice, disabled }: Props) {
  const [open, setOpen] = useState(true) // returning-orders list expanded
  const [expanded, setExpanded] = useState<string | null>(null)

  const norm = normalizePhone(text)
  const matches = searchCustomers(customers, text)
  const isNew = norm.valid && !customers.some((c) => c.id === norm.phone)

  const all = useMemo(() => (attached ? lastOrders(bills, attached, Infinity) : []), [bills, attached])
  const recent = all.slice(0, 3)

  const attach = (phone: string) => {
    setOpen(true)
    setExpanded(null)
    onAttach(phone)
  }

  return (
    <div className="cust">
      {attached ? (
        <div className="cust-chip">
          <span>Customer {maskPhone(attached)}</span>
          <button aria-label="Remove customer" disabled={disabled} onClick={onDetach}>×</button>
        </div>
      ) : (
        <div className="cust-search">
          <input
            className="field"
            type="text"
            inputMode="numeric"
            aria-label="Customer (optional): search or enter phone"
            placeholder="Customer (optional): search or enter phone"
            value={text}
            disabled={disabled}
            onChange={(e) => onText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey || !norm.valid) return
              e.preventDefault()
              attach(norm.phone)
            }}
          />
          {text.trim() !== '' && (matches.length > 0 || isNew) && (
            <ul className="cust-drop">
              {matches.map((c) => (
                <li key={c.id}>
                  <button onClick={() => attach(c.id)}>{maskPhone(c.phone)}</button>
                </li>
              ))}
              {isNew && (
                <li className="new">
                  <span>New customer {maskPhone(norm.phone)}</span>
                  <button className="btn primary" onClick={() => attach(norm.phone)}>Attach</button>
                </li>
              )}
            </ul>
          )}
          {text.trim() !== '' && (
            <p className="cust-warn">Select a customer, attach a valid new number, or clear the field</p>
          )}
        </div>
      )}

      {attached && all.length > 0 && (
        <div className="returning">
          <button className="returning-head" onClick={() => setOpen(!open)} aria-expanded={open}>
            Returning customer · {all.length} {all.length === 1 ? 'order' : 'orders'}
            <span>{open ? '▾' : '▸'}</span>
          </button>
          {open &&
            recent.map((b, i) => {
              const isOpen = expanded === b.id
              const pays = payments.filter((p) => p.billId === b.id)
              return (
                <div key={b.id} className="order">
                  <div className="order-row" onClick={() => setExpanded(isOpen ? null : b.id)}>
                    <div className="order-info">
                      <span className="order-date">{formatDateTime(b.createdAt)}</span>
                      <span className="order-items">{orderSummary(b)}</span>
                      <span className="order-total">{formatRupees(b.totals.total)}</span>
                    </div>
                    <button
                      className={'repeat' + (i === 0 ? ' primary' : '')}
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation()
                        onRepeat(b)
                        setOpen(false)
                      }}
                    >
                      {i === 0 ? 'Repeat last order' : 'Repeat'}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="order-detail">
                      {b.lines.map((l, j) => (
                        <div key={j} className="od-line">
                          <span>
                            {l.quantity}× {l.name}
                            {l.variantName && <sub>Variant: {l.variantName}</sub>}
                            {l.addOnNames.length > 0 && <sub>Add-on: {l.addOnNames.join(', ')}</sub>}
                          </span>
                          <span>{formatRupees(l.lineTotal)}</span>
                        </div>
                      ))}
                      <p className="od-pay">
                        {pays.length === 0 ? 'No payment due' : pays.map((p) => `${MODE_LABEL[p.mode]} ${formatRupees(p.amount)}`).join(' · ')}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
      {notice && <p className="cust-notice">{notice}</p>}
    </div>
  )
}
