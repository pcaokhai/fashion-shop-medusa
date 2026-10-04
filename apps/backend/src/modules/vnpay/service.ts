/* eslint-disable @typescript-eslint/require-await -- the payment provider interface is async; most methods here have nothing to await */
// VNPay payment provider (id pp_vnpay_vnpay). It only builds the gateway URL; it never decides that money arrived.
// Payment truth is written to the session by the verified-IPN workflow (`data.ipn`) and read back by authorizePayment.
import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput, AuthorizePaymentOutput, CancelPaymentInput, CancelPaymentOutput, CapturePaymentInput, CapturePaymentOutput,
  DeletePaymentInput, DeletePaymentOutput, GetPaymentStatusInput, GetPaymentStatusOutput, InitiatePaymentInput, InitiatePaymentOutput,
  RefundPaymentOutput, RetrievePaymentInput, RetrievePaymentOutput, UpdatePaymentInput,
  UpdatePaymentOutput, WebhookActionResult,
} from "@medusajs/framework/types"
import { vnpayConfig } from "../../lib/vnpay/config"
import { Vnd, toVnpAmount } from "../../lib/money"
import { formatVnpDate, sign, type VnpParams } from "../../lib/vnpay/sign"
import { sessionIdToTxnRef } from "../../lib/vnpay/txn-ref"

const EXPIRE_MINUTES = 15
type IpnMark = { response_code: string; amount_vnd: number; transaction_no: string }

export default class VnpayProviderService extends AbstractPaymentProvider<Record<string, never>> {
  static identifier = "vnpay"

  // Medusa instantiates providers with (container, options); the explicit public constructor is what ModuleProvider's type needs
  constructor(container: Record<string, unknown>, options: Record<string, never>) {
    super(container, options)
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const cfg = vnpayConfig()
    const sessionId = input.context?.idempotency_key
    if (!sessionId) throw new Error("VNPay needs the payment session id (context.idempotency_key)")
    const amountVnd = Vnd(Number(input.amount))
    const txnRef = sessionIdToTxnRef(sessionId)
    const now = new Date()
    const params: VnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: cfg.tmnCode,
      vnp_Amount: String(toVnpAmount(amountVnd)),
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don hang ${txnRef}`, // ASCII only, as the gateway requires
      vnp_OrderType: "other",
      vnp_Locale: "vn",
      vnp_ReturnUrl: cfg.returnUrl,
      vnp_IpAddr: "127.0.0.1", // ponytail: client IP is not available inside the provider; real client IP needs a custom route
      vnp_CreateDate: formatVnpDate(now),
      vnp_ExpireDate: formatVnpDate(new Date(now.getTime() + EXPIRE_MINUTES * 60_000)),
    }
    const query = new URLSearchParams({ ...params, vnp_SecureHash: sign(params, cfg.hashSecret) })
    // URLSearchParams form-encodes with '+' for spaces, the same rule the signature uses
    // (a ! ' ( ) * in a value would differ, but none of our values contain them)
    return { id: txnRef, data: { txn_ref: txnRef, amount_vnd: amountVnd, payment_url: `${cfg.payUrl}?${query.toString()}` }, status: "pending" }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = input.data ?? {}
    const ipn = data.ipn as IpnMark | undefined
    const paid = ipn?.response_code === "00" && ipn.amount_vnd === Number(data.amount_vnd)
    return { data, status: paid ? "authorized" : "pending" }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { data: input.data ?? {}, status: (input.data?.ipn as IpnMark | undefined)?.response_code === "00" ? "authorized" : "pending" }
  }

  // The gateway already took the money when the IPN said so; nothing to call.
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async refundPayment(): Promise<RefundPaymentOutput> {
    throw new Error("VNPay refunds are not implemented yet (F1)")
  }

  // IPNs arrive on the custom route /hooks/vnpay/ipn, which answers in VNPay's own format.
  async getWebhookActionAndData(): Promise<WebhookActionResult> {
    return { action: "not_supported" }
  }
}
