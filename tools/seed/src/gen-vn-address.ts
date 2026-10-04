// Builds apps/backend/src/lib/vn-address/data.json (2-tier: 34 provinces, 3.321 wards) from the MIT-licensed
// `vietnam-address-database` (Resolution 202/2025/QH15 administrative list). Official GSO codes are kept.
// Run: pnpm --filter @vck/seed address-data
import { mkdirSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

type Table = { type: string; name?: string; data?: Record<string, string>[] }
const rows = (db: Table[], name: string) => db.find((t) => t.type === "table" && t.name === name)?.data ?? []

const db = createRequire(import.meta.url)("vietnam-address-database") as Table[]
const provinces = rows(db, "provinces").map((p) => ({ code: p.province_code ?? "", name: p.name ?? "" }))
const wards: Record<string, { code: string; name: string }[]> = {}
for (const w of rows(db, "wards")) (wards[w.province_code ?? ""] ??= []).push({ code: w.ward_code ?? "", name: w.name ?? "" })

const codes = rows(db, "wards").map((w) => w.ward_code)
if (new Set(codes).size !== codes.length) throw new Error("ward codes are not unique")
if (provinces.some((p) => !wards[p.code]?.length)) throw new Error("province without wards")

const out = fileURLToPath(new URL("../../../apps/backend/src/lib/vn-address/", import.meta.url))
mkdirSync(out, { recursive: true })
writeFileSync(`${out}data.json`, `${JSON.stringify({ provinces, wards })}\n`)
console.log(`${provinces.length} provinces, ${codes.length} wards`)
