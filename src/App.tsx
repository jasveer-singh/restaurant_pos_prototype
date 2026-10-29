import { getCategories, getItems } from './lib/seed'

export default function App() {
  const categories = [...getCategories()].sort((a, b) => a.sortOrder - b.sortOrder)
  const items = getItems()

  return (
    <main className="seed-check">
      <h1>Seed check</h1>
      <p>
        {categories.length} categories, {items.length} items loaded from localStorage.
      </p>
      {categories.map((c) => (
        <section key={c.id}>
          <h2>{c.name}</h2>
          <ul>
            {items
              .filter((i) => i.categoryId === c.id)
              .map((i) => (
                <li key={i.id}>{i.name}</li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
