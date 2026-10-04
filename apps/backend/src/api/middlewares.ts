import { defineMiddlewares, type MedusaNextFunction, type MedusaRequest, type MedusaResponse } from "@medusajs/framework/http"
import { sendProblem } from "../lib/problem"
import { isWardOf } from "../lib/vn-address"

type ErrorBody = { type?: string; code?: string; message?: string } | null

// Medusa answers "not enough stock" with 400 not_allowed (coded `insufficient_inventory` when the cart is validated, and an
// uncoded "Not enough stock available ..." when the inventory reservation loses a race). The contract says 409 for both.
const isStockout = (b: ErrorBody) =>
  b?.code === "insufficient_inventory" || (b?.type === "not_allowed" && /not enough stock|required inventory/i.test(b.message ?? ""))

function stockoutIs409(_req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const json = res.json.bind(res)
  res.json = (body: unknown) => {
    if (isStockout(body as ErrorBody)) res.status(409)
    return json(body)
  }
  next()
}

type Address = { country_code?: string; province?: string; city?: string }

// The storefront sends province = province code and city = ward code (2-tier address); reject pairs that do not exist.
function validateCartAddress(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const address = (req.body as { shipping_address?: Address } | undefined)?.shipping_address
  if (!address || (address.country_code && address.country_code.toLowerCase() !== "vn")) return next()
  if (isWardOf(address.province, address.city)) return next()
  return sendProblem(res, 400, "Province and ward must be a valid 2-tier pair", [
    { field: "shipping_address.city", message: "ward code does not belong to the province code" },
  ])
}

export default defineMiddlewares({
  routes: [
    { matcher: "/store/carts/*", method: ["POST"], middlewares: [stockoutIs409] },
    { matcher: "/store/carts/:id", method: ["POST"], middlewares: [validateCartAddress] },
  ],
})
