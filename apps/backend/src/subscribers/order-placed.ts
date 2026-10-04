import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendOrderConfirmationWorkflow } from "../workflows/send-order-confirmation"

export default async function orderPlaced({ event, container }: SubscriberArgs<{ id: string }>) {
  await sendOrderConfirmationWorkflow(container).run({ input: { id: event.data.id } })
}

export const config: SubscriberConfig = { event: "order.placed" }
