// VNPay checksum, pure. Rule (contracts/vnpay/golden-vectors.json): drop vnp_SecureHash/vnp_SecureHashType and empty values,
// sort by key, form-urlencode key and value (space -> '+'), join with '&', HMAC-SHA512 with the hash secret, lowercase hex.
import { createHmac, timingSafeEqual } from "node:crypto"

export type VnpParams = Record<string, string>

// encodeURIComponent leaves ! ' ( ) * unescaped; Python's quote_plus (the golden vectors) escapes them.
const formEncode = (s: string) =>
  encodeURIComponent(s)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+")

export function buildSignData(params: VnpParams): string {
  return Object.entries(params)
    .filter(([k, v]) => k !== "vnp_SecureHash" && k !== "vnp_SecureHashType" && v !== "")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${formEncode(k)}=${formEncode(v)}`)
    .join("&")
}

export const sign = (params: VnpParams, secret: string): string => createHmac("sha512", secret).update(buildSignData(params)).digest("hex")

/** Constant-time comparison of the received vnp_SecureHash with the one computed from the other params. */
export function verifySignature(params: VnpParams, secret: string): boolean {
  const received = Uint8Array.from(Buffer.from((params.vnp_SecureHash ?? "").toLowerCase(), "utf8"))
  const expected = Uint8Array.from(Buffer.from(sign(params, secret), "utf8"))
  return received.length === expected.length && timingSafeEqual(received, expected)
}

/** yyyyMMddHHmmss in Vietnam time (UTC+7), the format of vnp_CreateDate / vnp_ExpireDate / vnp_PayDate. */
export function formatVnpDate(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return vn.toISOString().replace(/[-:T]/g, "").slice(0, 14)
}
