// VNPay settings come from env only (rule 6). Validated on use, so the backend still boots without them.
import { z } from "zod"

const schema = z.object({
  VNPAY_TMN_CODE: z.string().min(1),
  VNPAY_HASH_SECRET: z.string().min(16),
  VNPAY_PAY_URL: z.url(),
  VNPAY_RETURN_URL: z.url(),
})

export type VnpayConfig = { tmnCode: string; hashSecret: string; payUrl: string; returnUrl: string }

export function vnpayConfig(env: NodeJS.ProcessEnv = process.env): VnpayConfig {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    throw new Error(`VNPay is not configured, set ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`)
  }
  const e = parsed.data
  return { tmnCode: e.VNPAY_TMN_CODE, hashSecret: e.VNPAY_HASH_SECRET, payUrl: e.VNPAY_PAY_URL, returnUrl: e.VNPAY_RETURN_URL }
}
