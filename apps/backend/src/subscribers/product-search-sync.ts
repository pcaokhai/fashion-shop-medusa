import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { indexProducts } from "../lib/search-index"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import type MeilisearchModuleService from "../modules/meilisearch/service"

export default async function productSearchSync({ event, container }: SubscriberArgs<{ id: string }>) {
  if (event.name === "product.deleted") {
    await container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE).remove([event.data.id])
    return
  }
  await indexProducts(container, [event.data.id])
}

export const config: SubscriberConfig = { event: ["product.created", "product.updated", "product.deleted"] }
