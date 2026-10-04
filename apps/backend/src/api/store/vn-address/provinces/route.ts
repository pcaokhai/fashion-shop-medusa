import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listProvinces } from "../../../../lib/vn-address"

export function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.set("Cache-Control", "public, max-age=86400").json({ provinces: listProvinces() })
}
