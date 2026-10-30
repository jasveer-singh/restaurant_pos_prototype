import type { CSSProperties, ReactNode } from 'react'
import { FONT_PX } from '../lib/receiptConstants'
import type { Size } from '../lib/receiptConstants'
import type { BillReceipt, KotReceipt } from '../lib/receipts'
import '../receipt.css'

function T({ size, bold, center, style, children }: { size: Size; bold?: boolean; center?: boolean; style?: CSSProperties; children: ReactNode }) {
  return (
    <div style={{ fontSize: FONT_PX[size], fontWeight: bold ? 700 : 400, textAlign: center ? 'center' : undefined, ...style }}>
      {children}
    </div>
  )
}

const Sep = () => <hr className="sep" />
const Gap = () => <div className="gap" />

// Plain black-and-white cup mark.
function Logo() {
  return (
    <svg className="logo" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 18h24v10a10 10 0 0 1-10 10h-4A10 10 0 0 1 8 28z" />
      <path d="M32 21h4a4 4 0 0 1 0 8h-4" />
      <path d="M14 6c-2 2 2 3 0 6M20 6c-2 2 2 3 0 6M26 6c-2 2 2 3 0 6" />
      <path d="M6 43h28" />
    </svg>
  )
}

export function BillReceiptView({ data, className = '' }: { data: BillReceipt; className?: string }) {
  return (
    <div className={`receipt bill ${className}`}>
      {data.duplicate && <T size="L" bold center>DUPLICATE COPY</T>}
      <div className="logo-wrap"><Logo /></div>
      <T size="XL" bold center>{data.header.name}</T>
      <T size="S" center>{data.header.address}</T>
      <T size="S" center>{data.header.fssai}</T>
      <T size="S" center>{data.header.gstin}</T>
      <Sep />
      <T size="M">Bill No: {data.billNumber}</T>
      <T size="L" bold>Token {data.token}</T>
      <T size="M" bold>{data.orderType}</T>
      <T size="S">{data.dateTime}</T>
      {data.customer && <T size="S">Customer: {data.customer}</T>}
      <Sep />
      <Gap />
      <div className="row bill-row head">
        <T size="M" bold>Item</T>
        <T size="M" bold style={{ textAlign: 'center' }}>Qty</T>
        <T size="M" bold style={{ textAlign: 'right' }}>Price (₹)</T>
      </div>
      {data.lines.map((l, i) => (
        <div key={i} className="row bill-row">
          <div className="item">
            <T size="M">{l.name}</T>
            {l.details.map((d, j) => <T key={j} size="S" style={{ paddingLeft: '3mm' }}>{d}</T>)}
            {l.discount && <T size="S" style={{ paddingLeft: '3mm' }}>{l.discount}</T>}
          </div>
          <T size="M" style={{ textAlign: 'center' }}>{l.qty}</T>
          <T size="M" style={{ textAlign: 'right' }}>{l.price}</T>
        </div>
      ))}
      <Sep />
      {data.totals.map((t) => (
        <div key={t.key} className="pair">
          <T size={t.size} bold={t.bold}>{t.label}</T>
          <T size={t.size} bold={t.bold}>{t.text}</T>
        </div>
      ))}
      <Sep />
      <Gap />
      <T size="XL" bold center>{data.statusText}</T>
      {data.payments.map((p, i) => <T key={i} size="S">{p}</T>)}
    </div>
  )
}

export function KotReceiptView({ data, className = '' }: { data: KotReceipt; className?: string }) {
  return (
    <div className={`receipt kot ${className}`}>
      <T size="XL" bold center>{data.token}</T>
      <T size="L" bold center>{data.orderType}</T>
      <T size="M">Bill No: {data.billNumber}</T>
      <T size="S">{data.dateTime}</T>
      <Sep />
      <Gap />
      <div className="row kot-row head">
        <T size="M" bold>Item</T>
        <T size="M" bold style={{ textAlign: 'center' }}>Qty</T>
      </div>
      {data.lines.map((l, i) => (
        <div key={i} className="row kot-row">
          <div className="item">
            <T size="M">{l.name}</T>
            {l.details.map((d, j) => <T key={j} size="S" bold style={{ paddingLeft: '3mm' }}>{d}</T>)}
          </div>
          <T size="M" style={{ textAlign: 'center' }}>{l.qty}</T>
        </div>
      ))}
      <Sep />
      <Gap />
    </div>
  )
}
