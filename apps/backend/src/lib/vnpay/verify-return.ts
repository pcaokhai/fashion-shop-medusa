// What the browser return page may show. Reads state written by the IPN; never changes anything.
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VNPAY_IPN_MODULE } from "../../modules/vnpay-ipn"
import type VnpayIpnModuleService from "../../modules/vnpay-ipn/service"
import { vnpayConfig } from "./config"
import { verifySignature } from "./sign"
import { txnRefToSessionId } from "./txn-ref"

export type ReturnStatus = {
  checksum_valid: boolean
  display_status: "PAID" | "PENDING_CONFIRMATION" | "FAILED" | "CANCELLED_BY_USER"
  order_id: string | null
  cart_id: string | null
}

const USER_CANCELLED = "24"

export async function verifyVnpayReturn(container: MedusaContainer, query: Record<string, string>): Promise<ReturnStatus> {
  if (!verifySignature(query, vnpayConfig().hashSecret)) return { checksum_valid: false, display_status: "FAILED", order_id: null, cart_id: null }

  const txnRef = query.vnp_TxnRef ?? ""
  const code = query.vnp_ResponseCode
  const ipn: VnpayIpnModuleService = container.resolve(VNPAY_IPN_MODULE)
  const [paid] = await ipn.listVnpayIpns({ txn_ref: txnRef, response_code: "00" })
  const cartId = await findCartId(container, txnRef)

  if (code === USER_CANCELLED) return { checksum_valid: true, display_status: "CANCELLED_BY_USER", order_id: null, cart_id: cartId }
  if (code !== "00") return { checksum_valid: true, display_status: "FAILED", order_id: null, cart_id: cartId }
  // The browser says success; only a stored, verified IPN with an order turns that into PAID.
  if (paid?.order_id) return { checksum_valid: true, display_status: "PAID", order_id: paid.order_id, cart_id: cartId }
  return { checksum_valid: true, display_status: "PENDING_CONFIRMATION", order_id: null, cart_id: cartId }
}

async function findCartId(container: MedusaContainer, txnRef: string): Promise<string | null> {
  const sessionId = txnRefToSessionId(txnRef)
  if (!sessionId) return null
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: sessions } = await query.graph({ entity: "payment_session", fields: ["payment_collection_id"], filters: { id: sessionId } })
  const collectionId = sessions[0]?.payment_collection_id
  if (!collectionId) return null
  const { data: links } = await query.graph({ entity: "cart_payment_collection", fields: ["cart_id"], filters: { payment_collection_id: collectionId } })
  return (links[0]?.cart_id) ?? null
}
