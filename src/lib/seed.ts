import menu from '../../menu.json'
import { hasKey, readJSON, writeJSON } from './storage'
import type { AddOnGroup, Bill, Category, Customer, Item, MenuMeta } from './types'

const KEYS = {
  meta: 'meta',
  categories: 'categories',
  addOnGroups: 'addOnGroups',
  items: 'items',
  bills: 'bills',
  customers: 'customers',
} as const

// Seeds only when nothing is stored yet, so a refresh never overwrites data.
export function seedIfEmpty(): void {
  if (hasKey(KEYS.items)) return
  writeJSON(KEYS.meta, menu.meta)
  writeJSON(KEYS.categories, menu.categories)
  writeJSON(KEYS.addOnGroups, menu.addOnGroups)
  writeJSON(KEYS.items, menu.items)
  if (!hasKey(KEYS.bills)) writeJSON<Bill[]>(KEYS.bills, [])
  if (!hasKey(KEYS.customers)) writeJSON<Customer[]>(KEYS.customers, [])
}

export const getMeta = () => readJSON<MenuMeta>(KEYS.meta)
export const getCategories = () => readJSON<Category[]>(KEYS.categories) ?? []
export const getAddOnGroups = () => readJSON<AddOnGroup[]>(KEYS.addOnGroups) ?? []
export const getItems = () => readJSON<Item[]>(KEYS.items) ?? []
