// Tiny Medusa client for seed tooling: finds the publishable key through the admin API so nothing is copied by hand.
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const TIMEOUT_MS = 5000 // CLAUDE.md rule 7

export const BASE = process.env.MEDUSA_URL ?? "http://localhost:9000"

function devEnv(): Record<string, string> {
  try {
    const text = readFileSync(fileURLToPath(new URL("../../../apps/backend/.env", import.meta.url)), "utf8")
    return Object.fromEntries(text.split("\n").filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]))
  } catch {
    return {}
  }
}

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status}`)
  return (await res.json()) as T
}

export async function publishableKey(): Promise<string> {
  const env = { ...devEnv(), ...process.env }
  const { token } = await json<{ token: string }>("/auth/user/emailpass", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: env.MEDUSA_ADMIN_EMAIL, password: env.MEDUSA_ADMIN_PASSWORD }),
  })
  const { api_keys } = await json<{ api_keys: { title: string; token: string }[] }>("/admin/api-keys?type=publishable", { headers: { authorization: `Bearer ${token}` } })
  const key = api_keys.find((k) => k.title === "VCK Storefront")
  if (!key) throw new Error("publishable key not found: run `make backend-setup`")
  return key.token
}

export async function storeClient() {
  const key = await publishableKey()
  const headers = { "x-publishable-api-key": key, "content-type": "application/json" }
  return {
    get: <T>(path: string) => json<T>(`/store${path}`, { headers }),
    post: <T>(path: string, body: unknown) => json<T>(`/store${path}`, { method: "POST", headers, body: JSON.stringify(body) }),
  }
}
