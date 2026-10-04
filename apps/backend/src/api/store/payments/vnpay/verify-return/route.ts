import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { sendProblem } from "../../../../../lib/problem"
import { verifyVnpayReturn } from "../../../../../lib/vnpay/verify-return"

const body = z.object({ query: z.record(z.string(), z.string()) })

// Display only: reports what the backend already knows from the IPN, never completes or pays anything.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = body.safeParse(req.body)
  if (!parsed.success) return sendProblem(res, 400, "Body must be { query: { vnp_*: string } }")
  res.json(await verifyVnpayReturn(req.scope, parsed.data.query))
}
