import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { handleVnpayIpn } from "../../../../lib/vnpay/ipn"

// Always HTTP 200: VNPay reads the outcome from RspCode (contracts/openapi.yaml VnpayIpnAck).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    res.status(200).json(await handleVnpayIpn(req.scope, req.query))
  } catch (e) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(`vnpay ipn crashed: ${e instanceof Error ? e.message : "unknown"}`) // message only, never the payload
    res.status(200).json({ RspCode: "99", Message: "Unknown error" })
  }
}
