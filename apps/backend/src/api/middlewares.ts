import { defineMiddlewares, type MedusaNextFunction, type MedusaRequest, type MedusaResponse } from "@medusajs/framework/http"

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

export default defineMiddlewares({
  routes: [{ matcher: "/store/carts/*", method: ["POST"], middlewares: [stockoutIs409] }],
})
