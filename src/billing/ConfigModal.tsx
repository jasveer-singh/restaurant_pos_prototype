import { useState } from 'react'
import { formatRupees, toPaise } from '../lib/money'
import type { AddOnGroup, Item } from '../lib/types'

export interface Config {
  variantId: string
  variantName: string
  addOnIds: string[]
  addOnNames: string[]
  unitPrice: number // paise
}

interface Props {
  item: Item
  groups: AddOnGroup[]
  onAdd: (c: Config) => void
  onClose: () => void
}

export default function ConfigModal({ item, groups, onAdd, onClose }: Props) {
  const [variantId, setVariantId] = useState(item.variants[0]?.id ?? '')
  const [picked, setPicked] = useState<string[]>([])
  const itemGroups = groups.filter((g) => item.addOnGroupIds.includes(g.id))
  const variant = item.variants.find((v) => v.id === variantId)
  const options = itemGroups.flatMap((g) => g.options)
  const chosen = options.filter((o) => picked.includes(o.id))
  const unitPrice = toPaise(variant?.price ?? 0) + chosen.reduce((s, o) => s + toPaise(o.price), 0)

  const toggle = (g: AddOnGroup, id: string) => {
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id)
      const inGroup = p.filter((x) => g.options.some((o) => o.id === x))
      if (inGroup.length >= g.maxSelect) {
        // single-select groups swap; multi-select groups block at the cap
        return g.maxSelect === 1 ? [...p.filter((x) => !inGroup.includes(x)), id] : p
      }
      return [...p, id]
    })
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>{item.name}</h2>
        {item.variants.length > 1 && (
          <section>
            <h3>Variant</h3>
            <div className="chips">
              {item.variants.map((v) => (
                <button key={v.id} className={'chip' + (v.id === variantId ? ' on' : '')} onClick={() => setVariantId(v.id)}>
                  {v.name} · ₹{v.price}
                </button>
              ))}
            </div>
          </section>
        )}
        {itemGroups.map((g) => {
          const count = picked.filter((id) => g.options.some((o) => o.id === id)).length
          return (
            <section key={g.id}>
              <h3>
                {g.name} <small>(up to {g.maxSelect})</small>
              </h3>
              <div className="chips">
                {g.options.map((o) => {
                  const on = picked.includes(o.id)
                  const blocked = !on && g.maxSelect > 1 && count >= g.maxSelect
                  return (
                    <button key={o.id} className={'chip' + (on ? ' on' : '')} disabled={blocked} onClick={() => toggle(g, o.id)}>
                      {o.name}
                      {o.price > 0 && ` · +₹${o.price}`}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            disabled={!variant}
            onClick={() =>
              variant &&
              onAdd({
                variantId: variant.id,
                variantName: variant.name,
                addOnIds: chosen.map((o) => o.id),
                addOnNames: chosen.map((o) => o.name),
                unitPrice,
              })
            }
          >
            Add · {formatRupees(unitPrice)}
          </button>
        </div>
      </div>
    </div>
  )
}
