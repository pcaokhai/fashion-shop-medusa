import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendProblem } from "../../../lib/problem"
import { searchQuery, toMeili, toResponse } from "../../../lib/search-query"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = searchQuery.safeParse(req.query)
  if (!parsed.success) {
    return sendProblem(res, 400, "Invalid search query", parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })))
  }
  const q = parsed.data
  const params = toMeili(q)
  try {
    const search: MeilisearchModuleService = req.scope.resolve(MEILISEARCH_MODULE)
    res.json(toResponse(await search.search(q.q, params), params.offset, q.limit))
  } catch (e) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(`search failed: ${e instanceof Error ? e.message : "unknown"}`)
    sendProblem(res, 503, "Search is temporarily unavailable")
  }
}
