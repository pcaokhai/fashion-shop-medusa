// Loads products from Medusa and (re)indexes them. Used by the product subscribers and the seed/reindex scripts.
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import type MeilisearchModuleService from "../modules/meilisearch/service"
import { toSearchDoc, type ProductRow } from "./search-doc"

const BATCH = 100
const FIELDS = [
  "id", "handle", "title", "description", "thumbnail", "created_at", "metadata",
  "categories.id", "categories.name", "options.title", "options.values.value",
  "variants.calculated_price", "variants.inventory_items.inventory.location_levels.stocked_quantity",
  "variants.inventory_items.inventory.location_levels.reserved_quantity",
]

export async function indexProducts(container: MedusaContainer, ids?: string[]): Promise<number> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const search: MeilisearchModuleService = container.resolve(MEILISEARCH_MODULE)
  await search.configure()
  let indexed = 0
  for (let offset = 0; ; offset += BATCH) {
    const { data } = await query.graph({
      entity: "product",
      fields: FIELDS,
      filters: { status: "published", ...(ids ? { id: ids } : {}) },
      pagination: { skip: offset, take: BATCH },
      context: { variants: { calculated_price: QueryContext({ currency_code: "vnd" }) } },
    })
    await search.upsert((data as unknown as ProductRow[]).map(toSearchDoc))
    indexed += data.length
    if (data.length < BATCH) return indexed
  }
}
