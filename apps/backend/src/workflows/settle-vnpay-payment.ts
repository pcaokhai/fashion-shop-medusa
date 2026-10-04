// Settles one verified VNPay IPN. Order of effects: (1) record the IPN under its unique key (the dedupe),
// (2) for a successful payment stamp the session, authorize it (Medusa completes the cart into an order) and capture.
// If anything after (1) fails the record is deleted again, so VNPay's retry is processed instead of being taken for a duplicate.
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { StepResponse, WorkflowResponse, createStep, createWorkflow, transform, when } from "@medusajs/framework/workflows-sdk"
import { processPaymentWorkflow } from "@medusajs/medusa/core-flows"
import { VNPAY_IPN_MODULE } from "../modules/vnpay-ipn"
import type VnpayIpnModuleService from "../modules/vnpay-ipn/service"

export type SettleInput = {
  session_id: string
  txn_ref: string
  transaction_no: string
  response_code: string
  transaction_status: string
  amount_vnd: number
}

// Medusa maps a unique-index violation to invalid_data "... already exists." (older versions: duplicate_error / pg 23505)
const isUniqueViolation = (e: unknown) => {
  const err = e as { type?: string; code?: string; message?: string } | null
  return err?.type === "duplicate_error" || err?.code === "23505" || /already exists/i.test(err?.message ?? "")
}

const recordIpn = createStep(
  "vnpay-record-ipn",
  async (input: SettleInput, { container }) => {
    const ipn: VnpayIpnModuleService = container.resolve(VNPAY_IPN_MODULE)
    try {
      const row = await ipn.createVnpayIpns({ txn_ref: input.txn_ref, transaction_no: input.transaction_no, response_code: input.response_code, amount_vnd: input.amount_vnd })
      return new StepResponse(row.id, row.id)
    } catch (e) {
      if (isUniqueViolation(e)) throw new MedusaError(MedusaError.Types.CONFLICT, "duplicate VNPay IPN")
      throw e
    }
  },
  async (id, { container }) => {
    if (id) await container.resolve<VnpayIpnModuleService>(VNPAY_IPN_MODULE).deleteVnpayIpns(id)
  },
)

// Stamps the verified outcome on the session; VnpayProviderService.authorizePayment reads it back.
const markSessionPaid = createStep(
  "vnpay-mark-session-paid",
  async (input: SettleInput, { container }) => {
    const payments = container.resolve(Modules.PAYMENT)
    const session = await payments.retrievePaymentSession(input.session_id)
    const ipn = { response_code: input.response_code, amount_vnd: input.amount_vnd, transaction_no: input.transaction_no }
    await payments.updatePaymentSession({ id: session.id, data: { ...session.data, ipn }, amount: session.amount, currency_code: session.currency_code })
    return new StepResponse(session.id, { id: session.id, data: session.data, amount: session.amount, currency_code: session.currency_code })
  },
  async (before, { container }) => {
    if (before) await container.resolve(Modules.PAYMENT).updatePaymentSession(before)
  },
)

// Reads the order the authorization created (payment session -> collection -> cart -> order); null if there is none yet.
const findOrder = createStep("vnpay-find-order", async (input: { session_id: string; ipn_id: string }, { container }) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: sessions } = await query.graph({ entity: "payment_session", fields: ["payment_collection_id"], filters: { id: input.session_id } })
  const collectionId = sessions[0]?.payment_collection_id
  if (!collectionId) return new StepResponse<string | null>(null)
  const { data: orders } = await query.graph({ entity: "order", fields: ["id"], filters: { payment_collections: { id: collectionId } } as never })
  const orderId = (orders[0]?.id) ?? null
  if (orderId) await container.resolve<VnpayIpnModuleService>(VNPAY_IPN_MODULE).updateVnpayIpns({ id: input.ipn_id, order_id: orderId })
  return new StepResponse(orderId)
})

export const settleVnpayPaymentWorkflow = createWorkflow("settle-vnpay-payment", (input: SettleInput) => {
  const ipnId = recordIpn(input)

  const orderId = when({ input, ipnId }, ({ input }) => input.response_code === "00" && input.transaction_status === "00").then(() => {
    const sessionId = markSessionPaid(input)
    const authorize = transform({ input, sessionId }, (d) => ({ action: "authorized" as const, data: { session_id: d.sessionId, amount: d.input.amount_vnd } }))
    const authorized = processPaymentWorkflow.runAsStep({ input: authorize }).config({ name: "vnpay-authorize-payment" })
    const capture = transform({ input, authorized }, (d) => ({ action: "captured" as const, data: { session_id: d.input.session_id, amount: d.input.amount_vnd } }))
    const captured = processPaymentWorkflow.runAsStep({ input: capture }).config({ name: "vnpay-capture-payment" })
    const lookup = transform({ input, ipnId, captured }, (d) => ({ session_id: d.input.session_id, ipn_id: d.ipnId }))
    return findOrder(lookup)
  })

  return new WorkflowResponse({ ipnId, orderId })
})
