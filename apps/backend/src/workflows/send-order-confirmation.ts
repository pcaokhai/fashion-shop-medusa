import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse, WorkflowResponse, createStep, createWorkflow } from "@medusajs/framework/workflows-sdk"
import nodemailer from "nodemailer"
import { buildOrderMail, type OrderMail } from "../lib/order-email"

const TIMEOUT_MS = 5000 // CLAUDE.md rule 7
const FROM = process.env.MAIL_FROM ?? "VN Commerce Kit <no-reply@vck.local>"

const COD_PROVIDER = "pp_system_default"
type OrderRow = Omit<OrderMail, "email" | "payment"> & { email?: string | null; payment_collections?: { payments?: { provider_id: string }[] }[] }

const loadOrderMail = createStep("load-order-mail", async (orderId: string, { container }) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "display_id", "email", "total", "shipping_total",
      "items.title", "items.variant_title", "items.quantity", "items.unit_price",
      "shipping_address.first_name", "shipping_address.last_name",
      "payment_collections.payments.provider_id",
    ],
    filters: { id: orderId },
  })
  const o = data[0] as unknown as OrderRow | undefined
  const mail: OrderMail | null = o?.email
    ? { ...o, email: o.email, payment: o.payment_collections?.some((pc) => pc.payments?.some((p) => p.provider_id === COD_PROVIDER)) ? "cod" : "other" }
    : null
  return new StepResponse(mail)
})

// No compensation: a sent email cannot be unsent, and the step is the last one in the workflow.
const sendMail = createStep("send-order-mail", async (order: OrderMail | null, { container }) => {
  if (!order) return new StepResponse({ sent: false })
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    connectionTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  })
  await transport.sendMail({ from: FROM, to: order.email, ...buildOrderMail(order) })
  logger.info(`order confirmation sent for #${order.display_id}`) // never log the address
  return new StepResponse({ sent: true })
})

export const sendOrderConfirmationWorkflow = createWorkflow("send-order-confirmation", (input: { id: string }) => {
  const order = loadOrderMail(input.id)
  return new WorkflowResponse(sendMail(order))
})
