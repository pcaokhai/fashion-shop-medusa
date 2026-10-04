import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendProblem } from "../../../../../../lib/problem"
import { listWards } from "../../../../../../lib/vn-address"

export function GET(req: MedusaRequest, res: MedusaResponse) {
  const wards = listWards(req.params.province_code ?? "")
  if (!wards) return sendProblem(res, 404, "Unknown province code")
  res.set("Cache-Control", "public, max-age=86400").json({ wards })
}
