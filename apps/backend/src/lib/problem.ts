import type { MedusaResponse } from "@medusajs/framework/http"

const TITLES: Record<number, string> = { 400: "Bad Request", 404: "Not Found", 503: "Service Unavailable" }

/** RFC 9457 problem+json, the error shape of every custom route (contracts/openapi.yaml `Problem`). */
export function sendProblem(res: MedusaResponse, status: number, detail: string, errors?: { field: string; message: string }[]) {
  res.status(status).type("application/problem+json").json({ type: "about:blank", title: TITLES[status] ?? "Error", status, detail, ...(errors ? { errors } : {}) })
}
