/** `npx medusa exec ./src/scripts/reindex-search.ts` (make search-reindex): rebuilds the whole product index. */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { indexProducts } from "../lib/search-index"

export default async function reindexSearch({ container }: ExecArgs) {
  const n = await indexProducts(container)
  container.resolve(ContainerRegistrationKeys.LOGGER).info(`search: indexed ${n} products`)
}
