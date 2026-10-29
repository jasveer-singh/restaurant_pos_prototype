import { useState } from 'react'
import { toPaise } from '../lib/money'
import type { Discount } from '../lib/totals'

interface Props {
  title: string
  maxPaise: number
  initial: Discount | null
  onApply: (d: Discount | null) => void
  onClose: () => void
}

const toInput = (d: Discount | null) =>
  d ? String(d.type === 'flat' ? d.value / 100 : d.value) : ''

export default function DiscountModal({ title, maxPaise, initial, onApply, onClose }: Props) {
  const [type, setType] = useState<'percent' | 'flat'>(initial?.type ?? 'percent')
  const [text, setText] = useState(toInput(initial))

  const apply = () => {
    const n = Number(text)
    if (!Number.isFinite(n) || n <= 0) return onApply(null)
    if (type === 'percent') onApply({ type, value: Math.min(n, 100) })
    else onApply({ type, value: Math.min(toPaise(n), maxPaise) })
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <div className="toggle">
          <button className={type === 'percent' ? 'on' : ''} onClick={() => setType('percent')}>
            Percent %
          </button>
          <button className={type === 'flat' ? 'on' : ''} onClick={() => setType('flat')}>
            Flat ₹
          </button>
        </div>
        <input
          className="field"
          type="number"
          inputMode="decimal"
          min={0}
          autoFocus
          placeholder={type === 'percent' ? 'Max 100' : `Max ${maxPaise / 100}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
        />
        <p className="hint">Enter 0 to clear. Capped at {type === 'percent' ? '100%' : `₹${(maxPaise / 100).toFixed(2)}`}.</p>
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  )
}
