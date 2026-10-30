import { useEffect, useMemo, useRef, useState } from 'react'
import { formatRupees, toPaise } from '../lib/money'
import { getAddOnGroups, getCategories, getItems } from '../lib/seed'
import { calculateTotals, lineGross, lineNet } from '../lib/totals'
import type { Discount } from '../lib/totals'
import { freshDraft } from '../lib/billState'
import { getDefaultMode, saveBill, setDefaultMode } from '../lib/billStore'
import type { PaymentInput } from '../lib/billStore'
import type { Bill, BillLine, Item, OrderType, Payment, PaymentMode } from '../lib/types'
import ConfigModal from './ConfigModal'
import type { Config } from './ConfigModal'
import DiscountModal from './DiscountModal'
import { CashModal, MODE_LABEL, QrModal, SettledSummary, SplitModal } from './PaymentModals'
import type { SplitPart } from './PaymentModals'

interface CartLine {
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

const POPULAR = 'popular'
const MODES: PaymentMode[] = ['upi', 'card', 'cash']
type SelectedMode = PaymentMode | 'split'

// An exact short-code match wins outright; otherwise substring matches, best first.
function searchItems(items: Item[], query: string): Item[] {
  const exact = items.filter((i) => i.code.toLowerCase() === query)
  if (exact.length > 0) return exact
  const rank = (i: Item) => {
    const name = i.name.toLowerCase()
    const code = i.code.toLowerCase()
    if (code.startsWith(query)) return 0
    if (name.startsWith(query)) return 1
    if (name.split(' ').some((w) => w.startsWith(query))) return 2
    if (name.includes(query) || code.includes(query)) return 3
    return -1
  }
  return items
    .map((i) => ({ i, r: rank(i) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .map((x) => x.i)
}

const lineKey = (itemId: string, c: Config) =>
  [itemId, c.variantId, ...[...c.addOnIds].sort()].join('|')

export default function BillingScreen() {
  const categories = useMemo(() => [...getCategories()].sort((a, b) => a.sortOrder - b.sortOrder), [])
  const items = useMemo(() => getItems(), [])
  const groups = useMemo(() => getAddOnGroups(), [])

  const [orderType, setOrderType] = useState<OrderType>('takeaway')
  const [categoryId, setCategoryId] = useState(POPULAR)
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<CartLine[]>([])
  const [billDiscount, setBillDiscount] = useState<Discount | null>(null)
  const [locked, setLocked] = useState(false)
  const [configItem, setConfigItem] = useState<Item | null>(null)
  const [discountFor, setDiscountFor] = useState<'bill' | string | null>(null)
  const [defaultMode, setDefaultModeState] = useState<PaymentMode>(getDefaultMode)
  const [mode, setMode] = useState<SelectedMode>(defaultMode)
  const [txnRef, setTxnRef] = useState('')
  const [payModal, setPayModal] = useState<'cash' | 'split' | 'qr' | null>(null)
  const [result, setResult] = useState<{ bill: Bill; payments: Payment[] } | null>(null)
  const savingRef = useRef(false) // set on the first Settle press so a double tap can't save twice
  const startRef = useRef<number | null>(null) // billing timer start

  const query = search.trim().toLowerCase()
  const visible = query ? searchItems(items, query) : categoryId === POPULAR
    ? items.filter((i) => i.isBestSeller)
    : items.filter((i) => i.categoryId === categoryId)

  const totals = calculateTotals(lines, billDiscount)

  const addLine = (item: Item, c: Config) => {
    const id = lineKey(item.id, c)
    setLines((prev) =>
      prev.some((l) => l.id === id)
        ? prev.map((l) => (l.id === id ? { ...l, quantity: l.quantity + 1 } : l))
        : [
            ...prev,
            {
              id,
              itemId: item.id,
              itemName: item.name,
              variantId: c.variantId,
              variantName: c.variantName,
              showVariant: item.variants.length > 1,
              addOnIds: c.addOnIds,
              addOnNames: c.addOnNames,
              unitPrice: c.unitPrice,
              quantity: 1,
              discount: null,
            },
          ],
    )
  }

  const onItemTap = (item: Item) => {
    if (result) newBill(true) // tapping an item after settling starts the next bill
    else if (locked) return
    const needsChoice = item.variants.length > 1 || item.addOnGroupIds.length > 0
    if (needsChoice) return setConfigItem(item)
    const v = item.variants[0]
    if (!v) return
    addLine(item, { variantId: v.id, variantName: v.name, addOnIds: [], addOnNames: [], unitPrice: toPaise(v.price) })
  }

  const changeQty = (id: string, delta: number) =>
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.id !== id) return [l]
        const q = l.quantity + delta
        return q < 1 ? [] : [{ ...l, quantity: q }]
      }),
    )

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id))

  // Billing timer: starts with the first line, resets when the cart empties.
  useEffect(() => {
    if (lines.length === 0) {
      startRef.current = null
      // an emptied cart is a fresh bill: a leftover bill discount or ref must not carry over
      setBillDiscount(null)
      setTxnRef('')
    } else if (startRef.current === null) startRef.current = Date.now()
  }, [lines.length])

  const canSettle = lines.length > 0 && !locked
  const zeroDue = lines.length > 0 && totals.total === 0

  const finalize = (payments: PaymentInput[]) => {
    if (savingRef.current) return
    savingRef.current = true
    setLocked(true)
    try {
      const snapshot: BillLine[] = lines.map((l) => ({
        itemId: l.itemId,
        name: l.itemName,
        variantName: l.showVariant ? l.variantName : null,
        addOnNames: l.addOnNames,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
        discountAmount: lineGross(l) - lineNet(l),
        lineTotal: lineNet(l),
      }))
      const saved = saveBill({
        orderType,
        lines: snapshot,
        billDiscount,
        totals: {
          subtotal: totals.subtotal,
          itemDiscount: totals.itemDiscount,
          billDiscount: totals.billDiscount,
          cgst: totals.cgst,
          sgst: totals.sgst,
          roundOff: totals.roundOff,
          total: totals.total,
        },
        billingMs: Date.now() - (startRef.current ?? Date.now()),
        payments,
      })
      setPayModal(null)
      setResult(saved)
    } catch {
      savingRef.current = false
      setLocked(false)
      window.alert('Could not save the bill. Please try again.')
    }
  }

  const settleMain = () => {
    if (!canSettle || savingRef.current) return
    if (zeroDue) return finalize([]) // nothing to collect: no payment record
    if (mode === 'split') return setPayModal('split')
    if (mode === 'cash') return setPayModal('cash')
    finalize([{ mode, amount: totals.total, reference: txnRef || undefined }])
  }

  const settleCash = (cashReceived: number) =>
    finalize([{ mode: 'cash', amount: totals.total, cashReceived }])
  const settleSplit = (parts: SplitPart[]) =>
    finalize(parts.map((p) => ({ ...p, cashReceived: p.mode === 'cash' ? p.amount : undefined })))

  const newBill = (keepSearch = false) => {
    savingRef.current = false
    startRef.current = null
    const draft = freshDraft(defaultMode)
    setLines([])
    setBillDiscount(draft.billDiscount)
    setOrderType(draft.orderType)
    setLocked(false)
    setMode(draft.mode)
    setTxnRef(draft.txnRef)
    if (!keepSearch) setSearch('')
    setResult(null)
  }

  const closeModals = () => {
    setPayModal(null)
    setConfigItem(null)
    setDiscountFor(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result) {
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault()
          newBill()
        }
        return
      }
      const open = payModal || configItem || discountFor
      if (e.key === 'Escape' && open) closeModals()
      else if (e.key === 'Enter' && e.shiftKey && !open) {
        e.preventDefault()
        settleMain()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const pickMode = (m: PaymentMode) => {
    setMode(m)
    setTxnRef('')
  }

  const editingLine = lines.find((l) => l.id === discountFor)

  return (
    <div className="billing">
      <header className="topbar">
        <div className="toggle">
          {(['takeaway', 'dine-in'] as OrderType[]).map((t) => (
            <button key={t} className={orderType === t ? 'on' : ''} onClick={() => setOrderType(t)}>
              {t === 'takeaway' ? 'Takeaway' : 'Dine-in'}
            </button>
          ))}
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search item or code (e.g. MC)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || visible.length === 0) return
            onItemTap(visible[0])
            setSearch('')
          }}
        />
      </header>

      <div className="columns">
        <nav className="categories">
          {[{ id: POPULAR, name: 'Popular' }, ...categories].map((c) => (
            <button key={c.id} className={'cat' + (c.id === categoryId ? ' on' : '')} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </button>
          ))}
        </nav>

        <section className="items">
          <div className="grid">
            {visible.map((item) => {
              const prices = item.variants.map((v) => v.price)
              const min = Math.min(...prices)
              return (
                <button key={item.id} className="tile" disabled={locked && !result} onClick={() => onItemTap(item)}>
                  <span className={'veg ' + (item.isVeg ? 'v' : 'nv')} />
                  <span className="tile-name">{item.name}</span>
                  <span className="tile-meta">
                    {item.code} · {prices.length > 1 ? 'from ' : ''}₹{min}
                  </span>
                </button>
              )
            })}
            {visible.length === 0 && <p className="empty">No items found</p>}
          </div>
        </section>

        <aside className="cart">
          {result ? (
            <SettledSummary bill={result.bill} payments={result.payments} onNewBill={() => newBill()} />
          ) : (
          <ul className="cart-list">
            {lines.map((l) => {
              const net = lineNet(l)
              const gross = lineGross(l)
              return (
                <li key={l.id} className="row">
                  <button className="row-main" disabled={locked} onClick={() => setDiscountFor(l.id)}>
                    <span className="row-name">{l.itemName}</span>
                    {l.showVariant && <sub>Variant: {l.variantName}</sub>}
                    {l.addOnNames.length > 0 && <sub>Add-on: {l.addOnNames.join(', ')}</sub>}
                    {l.discount && <sub className="disc">Discount −{formatRupees(gross - net)}</sub>}
                  </button>
                  <div className="qty">
                    <button disabled={locked} aria-label="Decrease" onClick={() => changeQty(l.id, -1)}>−</button>
                    <span>{l.quantity}</span>
                    <button disabled={locked} aria-label="Increase" onClick={() => changeQty(l.id, 1)}>+</button>
                  </div>
                  <div className="price">
                    {net !== gross && <s>{formatRupees(gross)}</s>}
                    <span>{formatRupees(net)}</span>
                  </div>
                  <button className="remove" disabled={locked} aria-label="Remove" onClick={() => removeLine(l.id)}>×</button>
                </li>
              )
            })}
          </ul>
          )}

          <footer className="cart-foot">
            <dl className="totals">
              <dt>Subtotal</dt><dd>{formatRupees(totals.subtotal)}</dd>
              <dt>Discount</dt><dd>{totals.discount > 0 ? '−' : ''}{formatRupees(totals.discount)}</dd>
              <dt>CGST 2.5%</dt><dd>{formatRupees(totals.cgst)}</dd>
              <dt>SGST 2.5%</dt><dd>{formatRupees(totals.sgst)}</dd>
              <dt>Round off</dt><dd>{totals.roundOff > 0 ? '+' : ''}{formatRupees(totals.roundOff)}</dd>
              <dt className="grand">Total</dt><dd className="grand">{formatRupees(totals.total)}</dd>
            </dl>
            {!zeroDue && (
              <>
            <div className="chips modes">
              {MODES.map((m) => (
                <button key={m} className={'chip' + (mode === m ? ' on' : '')} disabled={locked} onClick={() => pickMode(m)}>
                  {MODE_LABEL[m]}
                </button>
              ))}
              <button className={'link' + (mode === 'split' ? ' on' : '')} disabled={!canSettle} onClick={() => { setMode('split'); setPayModal('split') }}>
                Split
              </button>
            </div>
            <div className="pay-extras">
              {mode === 'upi' && totals.total > 0 && (
                <button className="link" disabled={locked} onClick={() => setPayModal('qr')}>Show QR</button>
              )}
              {(mode === 'upi' || mode === 'card') && (
                <div className="ref-wrap">
                  <label className="lbl" htmlFor="txn-ref">Txn ref (last 4)</label>
                  <input
                    id="txn-ref"
                    className="field ref"
                    inputMode="numeric"
                    maxLength={4}
                    value={txnRef}
                    disabled={locked}
                    onChange={(e) => setTxnRef(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </div>
              )}
              {mode !== 'split' && mode !== defaultMode && (
                <button
                  className="link"
                  onClick={() => {
                    setDefaultMode(mode)
                    setDefaultModeState(mode)
                  }}
                >
                  Make {MODE_LABEL[mode]} the default
                </button>
              )}
            </div>
              </>
            )}
            <div className="foot-actions">
              <button className="btn" disabled={locked || lines.length === 0} onClick={() => setDiscountFor('bill')}>
                Discount
              </button>
              <button className="btn primary" disabled={!canSettle} onClick={settleMain}>
                {zeroDue
                  ? 'Settle · No payment due'
                  : `Settle${mode === 'split' ? ' · Split' : ` · ${MODE_LABEL[mode]}`} · ${formatRupees(totals.total).replace('.00', '')}`}
              </button>
            </div>
          </footer>
        </aside>
      </div>

      {payModal === 'qr' && <QrModal total={totals.total} onClose={() => setPayModal(null)} />}
      {payModal === 'cash' && <CashModal total={totals.total} onSettle={settleCash} onClose={() => setPayModal(null)} />}
      {payModal === 'split' && <SplitModal total={totals.total} onSettle={settleSplit} onClose={() => setPayModal(null)} />}

      {configItem && (
        <ConfigModal
          item={configItem}
          groups={groups}
          onClose={() => setConfigItem(null)}
          onAdd={(c) => {
            addLine(configItem, c)
            setConfigItem(null)
          }}
        />
      )}

      {discountFor === 'bill' && (
        <DiscountModal
          title="Bill discount"
          maxPaise={totals.subtotal - totals.itemDiscount}
          initial={billDiscount}
          onClose={() => setDiscountFor(null)}
          onApply={(d) => {
            setBillDiscount(d)
            setDiscountFor(null)
          }}
        />
      )}

      {editingLine && (
        <DiscountModal
          title={`Discount · ${editingLine.itemName}`}
          maxPaise={lineGross(editingLine)}
          initial={editingLine.discount}
          onClose={() => setDiscountFor(null)}
          onApply={(d) => {
            setLines((prev) => prev.map((l) => (l.id === editingLine.id ? { ...l, discount: d } : l)))
            setDiscountFor(null)
          }}
        />
      )}
    </div>
  )
}
