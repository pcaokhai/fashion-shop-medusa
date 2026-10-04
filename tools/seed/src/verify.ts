// `make seed-verify`: counts through the Store API. Usage: verify.ts [expectedProducts]
import { storeClient } from "./api.ts"

const expected = Number(process.argv[2] ?? 60)
const api = await storeClient()
const { count: products } = await api.get<{ count: number }>("/products?limit=1")
const { count: categories } = await api.get<{ count: number }>("/product-categories?limit=1")
const regions = await api.get<{ regions: { id: string; currency_code: string }[] }>("/regions")
console.log(`products=${products} categories=${categories} regions=${regions.regions.map((r) => `${r.id}/${r.currency_code}`).join(",")}`)
if (products !== expected) {
  console.error(`expected ${expected} products`)
  process.exit(1)
}
