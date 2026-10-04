// Records the Store API responses the storefront mock layer reads into contracts/fixtures/medusa/.
// Run against a seeded backend: `make record-fixtures`. complete.json stays hand-written until checkout (B3) exists.
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { storeClient } from "./api.ts"

const OUT = fileURLToPath(new URL("../../../contracts/fixtures/medusa/", import.meta.url))
const REGION_ID = "reg_vn"
// real.ts field list plus +metadata (rating, sold, is_new); WEB-1 adds the same to real.ts PRODUCT_FIELDS
const PRODUCT_FIELDS = "*variants.calculated_price,+variants.inventory_quantity,*categories,*images,+metadata"

const save = (name: string, body: unknown) => {
  // uploaded photos live at <backend>/static/<timestamp>-<file>; fixtures point at /mock/<file> so mock mode needs no backend
  const text = JSON.stringify(body, null, 2).replace(/"https?:\/\/[^"]*\/static\/\d+-([^"/]+)"/g, '"/mock/$1"')
  writeFileSync(`${OUT}${name}.json`, `${text}\n`)
  console.log(`recorded ${name}.json`)
}

const api = await storeClient()
const products = await api.get<{ products: { variants: { id: string }[] }[] }>(`/products?region_id=${REGION_ID}&fields=${encodeURIComponent(PRODUCT_FIELDS)}&limit=100`)
save("products", products)
save("categories", await api.get("/product-categories?limit=100&include_descendants_tree=true"))
save("regions", await api.get("/regions"))

const { cart } = await api.post<{ cart: { id: string } }>("/carts", { region_id: REGION_ID })
save("carts", await api.get(`/carts/${cart.id}?fields=${encodeURIComponent("*items,*items.variant")}`))
const variantId = products.products[0]?.variants[0]?.id
if (variantId) await api.post(`/carts/${cart.id}/line-items`, { variant_id: variantId, quantity: 1 })
save("shipping-options", await api.get(`/shipping-options?cart_id=${cart.id}`))
