// Pure: validated /store/search query -> Meilisearch parameters, and Meilisearch hits -> contract response.
import { z } from "zod"
import type { SearchDoc } from "./search-doc"

const list = z.preprocess((v): unknown[] => (v === undefined ? [] : Array.isArray(v) ? (v as unknown[]) : [v]), z.array(z.string()))

export const searchQuery = z.object({
  q: z.string().max(120).default(""),
  category_id: list,
  options: list.pipe(z.array(z.string().regex(/^[^:]+:.+$/))),
  price_min: z.coerce.number().int().min(0).optional(),
  price_max: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["RELEVANCE", "PRICE_ASC", "PRICE_DESC", "NEWEST", "BEST_SELLING"]).default("RELEVANCE"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
})
export type SearchQuery = z.infer<typeof searchQuery>

const SORT: Record<SearchQuery["sort"], string[]> = {
  RELEVANCE: [], PRICE_ASC: ["price_min:asc"], PRICE_DESC: ["price_min:desc"], NEWEST: ["created_at_ts:desc"], BEST_SELLING: ["sold:desc"],
}
const OPTION_KEY: Record<string, string> = { size: "size", color: "color" }
const quote = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` // values are user input inside a filter expression

export const decodeCursor = (c?: string): number => {
  try {
    const o = (JSON.parse(Buffer.from(c ?? "", "base64url").toString()) as { o?: unknown }).o
    return typeof o === "number" && o >= 0 ? Math.floor(o) : 0
  } catch {
    return 0
  }
}
const encodeCursor = (o: number) => Buffer.from(JSON.stringify({ o })).toString("base64url")

export function toMeili(q: SearchQuery) {
  const filter: string[] = []
  if (q.category_id.length) filter.push(`category_ids IN [${q.category_id.map(quote).join(",")}]`)
  if (q.price_min !== undefined) filter.push(`price_min >= ${q.price_min}`)
  if (q.price_max !== undefined) filter.push(`price_min <= ${q.price_max}`)
  // same option key = OR, different keys = AND
  const byKey = new Map<string, string[]>()
  for (const o of q.options) {
    const i = o.indexOf(":")
    const key = OPTION_KEY[o.slice(0, i).toLowerCase()]
    if (key) byKey.set(key, [...(byKey.get(key) ?? []), o.slice(i + 1)])
  }
  for (const [key, values] of byKey) filter.push(`${key} IN [${values.map(quote).join(",")}]`)
  return { filter, facets: ["category_ids", "size", "color", "in_stock"], sort: SORT[q.sort], limit: q.limit, offset: decodeCursor(q.cursor) }
}

type Hit = Pick<SearchDoc, "id" | "handle" | "title" | "thumbnail" | "price_min" | "price_max" | "rating_avg" | "in_stock">
type Res = { hits: Hit[]; facetDistribution?: Record<string, Record<string, number>>; estimatedTotalHits?: number; totalHits?: number; processingTimeMs: number }

export function toResponse(r: Res, offset: number, limit: number) {
  const total = r.totalHits ?? r.estimatedTotalHits ?? r.hits.length
  const facet = (key: string, from = key) => ({ key, values: Object.entries(r.facetDistribution?.[from] ?? {}).map(([value, count]) => ({ value, count })) })
  return {
    hits: r.hits.map((h) => ({ product_id: h.id, handle: h.handle, title: h.title, thumbnail: h.thumbnail, price_min: h.price_min, price_max: h.price_max, rating_avg: h.rating_avg, in_stock: h.in_stock })),
    facets: [facet("category", "category_ids"), facet("size"), facet("color"), facet("availability", "in_stock")],
    total_estimate: total,
    next_cursor: offset + r.hits.length < total ? encodeCursor(offset + limit) : null,
    took_ms: r.processingTimeMs,
  }
}
