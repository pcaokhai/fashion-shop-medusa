// VNPay IPN handling: signature first, then business checks, then the settle workflow. Returns VNPay's ack.
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { Vnd, toVnpAmount } from "../money"
import { settleVnpayPaymentWorkflow } from "../../workflows/settle-vnpay-payment"
import { vnpayConfig } from "./config"
import { verifySignature } from "./sign"
import { txnRefToSessionId } from "./txn-ref"

export type IpnAck = { RspCode: "00" | "01" | "02" | "04" | "97" | "99"; Message: string }
const ack = (RspCode: IpnAck["RspCode"], Message: string): IpnAck => ({ RspCode, Message })

const ipnFields = z.object({
  vnp_TmnCode: z.string(),
  vnp_TxnRef: z.string(),
  vnp_Amount: z.string().regex(/^\d+$/),
  vnp_ResponseCode: z.string(),
  vnp_TransactionNo: z.string().min(1),
  vnp_TransactionStatus: z.string().default(""),
})

export async function handleVnpayIpn(container: MedusaContainer, query: Record<string, unknown>): Promise<IpnAck> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const cfg = vnpayConfig()

  // 1. signature, before anything reads a business field
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => typeof v === "string")) as Record<string, string>
  if (Object.keys(params).length !== Object.keys(query).length || !verifySignature(params, cfg.hashSecret)) {
    logger.warn("vnpay ipn rejected: bad signature")
    return ack("97", "Invalid signature")
  }
  const parsed = ipnFields.safeParse(params)
  if (!parsed.success) return ack("99", "Unknown error")
  const f = parsed.data

  // 2. does it belong to us and to a session we know
  const sessionId = txnRefToSessionId(f.vnp_TxnRef)
  if (f.vnp_TmnCode !== cfg.tmnCode || !sessionId) return ack("01", "Order not found")
  const payments = container.resolve(Modules.PAYMENT)
  const sessions = await payments.listPaymentSessions({ id: sessionId })
  const session = sessions[0]
  if (!session) return ack("01", "Order not found")

  // 3. amount must be exactly what we asked for; an already settled session is "already confirmed"
  const amountVnd = Number(session.amount)
  if (Number(f.vnp_Amount) !== toVnpAmount(Vnd(amountVnd))) return ack("04", "Invalid amount")
  if (session.status === "authorized" || session.status === "captured") return ack("02", "Order already confirmed")

  // 4. dedupe + settle in one workflow
  const { errors } = await settleVnpayPaymentWorkflow(container).run({
    input: {
      session_id: sessionId,
      txn_ref: f.vnp_TxnRef,
      transaction_no: f.vnp_TransactionNo,
      response_code: f.vnp_ResponseCode,
      transaction_status: f.vnp_TransactionStatus,
      amount_vnd: amountVnd,
    },
    throwOnError: false,
  })
  if (errors.length) {
    const duplicate = errors.some((e) => (e.error as { type?: string } | undefined)?.type === "conflict")
    if (duplicate) return ack("02", "Order already confirmed")
    logger.error(`vnpay ipn ${f.vnp_TxnRef} failed: ${errors.map((e) => (e.error as Error | undefined)?.message ?? "unknown").join("; ")}`)
    return ack("99", "Unknown error")
  }
  logger.info(`vnpay ipn ${f.vnp_TxnRef} processed, response ${f.vnp_ResponseCode}`)
  return ack("00", "Confirm Success")
}
