// Pure: Medusa product row (query.graph) -> Meilisearch document. Money stays integer VND.
export type ProductRow = {
  id: string
  handle: string
  title: string
  description?: string | null
  thumbnail?: string | null
  created_at: string | Date
  metadata?: { rating?: number; sold?: number } | null
  categories?: { id: string; name: string }[] | null
  options?: { title: string; values?: { value: string }[] }[] | null
  variants?: {
    calculated_price?: { calculated_amount?: number | null } | null
    inventory_items?: { inventory?: { location_levels?: { stocked_quantity?: number; reserved_quantity?: number }[] } | null }[] | null
  }[] | null
}

export type SearchDoc = {
  id: string
  handle: string
  title: string
  description: string
  thumbnail: string | null
  category_ids: string[]
  category_names: string[]
  size: string[]
  color: string[]
  price_min: number
  price_max: number
  in_stock: boolean
  rating_avg: number | null
  sold: number
  created_at_ts: number
}

const optionValues = (p: ProductRow, title: string) => p.options?.find((o) => o.title === title)?.values?.map((v) => v.value) ?? []

const available = (v: NonNullable<ProductRow["variants"]>[number]) =>
  (v.inventory_items ?? []).some((i) => (i.inventory?.location_levels ?? []).some((l) => (l.stocked_quantity ?? 0) - (l.reserved_quantity ?? 0) > 0))

export function toSearchDoc(p: ProductRow): SearchDoc {
  const prices = (p.variants ?? []).map((v) => v.calculated_price?.calculated_amount).filter((n): n is number => typeof n === "number")
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description ?? "",
    thumbnail: p.thumbnail ?? null,
    category_ids: (p.categories ?? []).map((c) => c.id),
    category_names: (p.categories ?? []).map((c) => c.name),
    size: optionValues(p, "Kích thước"),
    color: optionValues(p, "Màu sắc"),
    price_min: prices.length ? Math.min(...prices) : 0,
    price_max: prices.length ? Math.max(...prices) : 0,
    in_stock: (p.variants ?? []).some(available),
    rating_avg: p.metadata?.rating ?? null,
    sold: p.metadata?.sold ?? 0,
    created_at_ts: new Date(p.created_at).getTime(),
  }
}
