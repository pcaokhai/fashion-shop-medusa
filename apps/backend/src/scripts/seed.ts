/**
 * B1a/B1b catalogue seed, idempotent: `npx medusa exec ./src/scripts/seed.ts [count]` (default 60; `make seed`).
 * Needs setup-store.ts first. Existing categories and products (by handle) are skipped, so a re-run creates nothing.
 * Photos come from tools/seed/assets and are uploaded through the file module, then reused across products.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"
import { buildCategories, buildProducts, slug, type ProductSpec } from "./seed/catalog"

const REGION_ID = "reg_vn"
const SIZE_OPTION = "Kích thước"
const COLOUR_OPTION = "Màu sắc"
const BATCH = 20
const ASSET_DIR = resolve(process.cwd(), "../../tools/seed/assets")

const chunk = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))
// a product sits in its leaf and every ancestor, so /store/products?category_id=<any level> just works
const lineage = (handle: string, specs: { handle: string; parent: string | null }[]): string[] => {
  const c = specs.find((x) => x.handle === handle)
  return c ? [c.handle, ...(c.parent ? lineage(c.parent, specs) : [])] : []
}
const imageFiles = (p: ProductSpec) => [1, 2].map((view) => `${p.kind}-${slug(p.colours[0] ?? "den")}-${view}.jpg`)

export default async function seed({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const count = Number(args?.[0] ?? process.env.SEED_COUNT ?? 60)

  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id"], filters: { name: "VCK Web" } })
  const { data: locations } = await query.graph({ entity: "stock_location", fields: ["id"], filters: { name: "Kho TP.HCM" } })
  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  const channelId = channels[0]?.id
  const locationId = locations[0]?.id
  const profileId = profiles[0]?.id
  if (!channelId || !locationId || !profileId) throw new Error("run setup-store.ts first (sales channel, stock location, shipping profile)")

  // categories, parents before children
  const { data: existingCats } = await query.graph({ entity: "product_category", fields: ["id", "handle"] })
  const catId = new Map<string, string>(existingCats.map((c) => [c.handle, c.id]))
  const specs = buildCategories()
  for (const depth of [0, 1, 2]) {
    const level = specs.filter((c) => (c.parent === null ? 0 : specs.find((p) => p.handle === c.parent)?.parent === null ? 1 : 2) === depth && !catId.has(c.handle))
    if (!level.length) continue
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: level.map((c) => ({ name: c.name, handle: c.handle, is_active: true, ...(c.parent ? { parent_category_id: catId.get(c.parent) } : {}) })) },
    })
    for (const c of result) catId.set(c.handle, c.id)
  }

  // products still missing
  const all = buildProducts(count)
  const { data: existing } = await query.graph({ entity: "product", fields: ["handle"], filters: { handle: all.map((p) => p.handle) } })
  const have = new Set(existing.map((p) => p.handle))
  const todo = all.filter((p) => !have.has(p.handle))
  logger.info(`seed: ${all.length} wanted, ${have.size} present, ${todo.length} to create`)
  if (!todo.length) return

  // upload each needed photo once
  const urls = new Map<string, string>()
  const wanted = [...new Set(todo.flatMap(imageFiles))]
  for (const files of chunk(wanted, 10)) {
    const { result } = await uploadFilesWorkflow(container).run({
      input: { files: files.map((filename) => ({ filename, mimeType: "image/jpeg", content: readFileSync(resolve(ASSET_DIR, filename)).toString("binary"), access: "public" as const })) },
    })
    result.forEach((f, i) => urls.set(files[i] as string, f.url))
  }

  const saleVariantPrices: { variant_id: string; amount: number; currency_code: string }[] = []
  for (const batch of chunk(todo, BATCH)) {
    await createProductsWorkflow(container).run({
      input: {
        products: batch.map((p) => {
          const photos = imageFiles(p).map((f) => ({ url: urls.get(f) as string }))
          return {
            title: p.title,
            handle: p.handle,
            description: p.description,
            status: ProductStatus.PUBLISHED,
            thumbnail: photos[0]?.url,
            images: photos,
            category_ids: lineage(p.categoryHandle, specs).map((h) => catId.get(h) as string),
            shipping_profile_id: profileId,
            sales_channels: [{ id: channelId }],
            metadata: p.metadata,
            options: [
              ...(p.sizeOption ? [{ title: SIZE_OPTION, values: p.sizeOption }] : []),
              { title: COLOUR_OPTION, values: p.colours },
            ],
            variants: p.variants.map((v) => ({
              title: v.title,
              sku: v.sku,
              manage_inventory: true,
              options: { ...(v.size ? { [SIZE_OPTION]: v.size } : {}), [COLOUR_OPTION]: v.colour },
              prices: [{ amount: v.price, currency_code: "vnd" }],
            })),
          }
        }),
      },
    })

    // stock levels for the variants just created
    const skus = batch.flatMap((p) => p.variants.map((v) => v.sku))
    const { data: variants } = await query.graph({ entity: "product_variant", fields: ["id", "sku", "inventory_items.inventory_item_id"], filters: { sku: skus } })
    const stock = new Map(batch.flatMap((p) => p.variants.map((v) => [v.sku, v.stock] as const)))
    const sale = new Map(batch.flatMap((p) => (p.salePrice ? p.variants.map((v) => [v.sku, p.salePrice as number] as const) : [])))
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: variants.flatMap((v) => {
          const itemId = v.inventory_items?.[0]?.inventory_item_id
          return itemId ? [{ inventory_item_id: itemId, location_id: locationId, stocked_quantity: stock.get(v.sku as string) ?? 0 }] : []
        }),
      },
    })
    for (const v of variants) {
      const amount = sale.get(v.sku as string)
      if (amount) saleVariantPrices.push({ variant_id: v.id, amount, currency_code: "vnd" })
    }
    logger.info(`seed: created ${batch.length} products`)
  }

  if (saleVariantPrices.length) {
    await createPriceListsWorkflow(container).run({
      input: { price_lists_data: [{ title: "Khuyến mãi demo", description: "Giảm 20% một số sản phẩm", status: "active", prices: saleVariantPrices }] },
    })
  }
  logger.info(`seed: done, REGION=${REGION_ID}, ${todo.length} products, ${saleVariantPrices.length} sale prices`)
}
