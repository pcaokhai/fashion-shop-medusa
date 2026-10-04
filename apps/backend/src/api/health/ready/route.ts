import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Redis } from "ioredis"
import { sendProblem } from "../../../lib/problem"

const TIMEOUT_MS = 3000

const withTimeout = <T>(p: Promise<T>, name: string) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${name} timed out`)), TIMEOUT_MS))])

async function redisPing(url: string) {
  const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 0, connectTimeout: TIMEOUT_MS })
  try {
    await redis.connect()
    await redis.ping()
  } finally {
    redis.disconnect()
  }
}

// Readiness for the proxy and the uptime check: database, Redis and Meilisearch all answer (contracts/openapi.yaml getReadiness).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const meili = `${process.env.MEILI_HOST ?? "http://localhost:7700"}/health`
  const checks: [string, () => Promise<unknown>][] = [
    ["database", () => req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION).raw("select 1")],
    ["redis", () => redisPing(process.env.REDIS_URL ?? "redis://localhost:6379")],
    ["search", async () => { if (!(await fetch(meili, { signal: AbortSignal.timeout(TIMEOUT_MS) })).ok) throw new Error("meilisearch not healthy") }],
  ]
  const failed: string[] = []
  await Promise.all(checks.map(async ([name, run]) => { try { await withTimeout(run(), name) } catch { failed.push(name) } }))
  if (failed.length) return sendProblem(res, 503, `Not ready: ${failed.join(", ")}`)
  res.json({ status: "ok" })
}
