// Same checksum rule as apps/backend/src/lib/vnpay/sign.ts and contracts/vnpay/golden-vectors.json (scripts/vnpay-sim.test.mjs proves it).
import { createHmac } from "node:crypto";

const formEncode = (s) =>
  encodeURIComponent(s)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");

export const signData = (params) =>
  Object.entries(params)
    .filter(([k, v]) => k !== "vnp_SecureHash" && k !== "vnp_SecureHashType" && v !== "")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${formEncode(k)}=${formEncode(v)}`)
    .join("&");

export const sign = (params, secret) => createHmac("sha512", secret).update(signData(params)).digest("hex");

export const withHash = (params, secret) => ({ ...params, vnp_SecureHash: sign(params, secret) });
