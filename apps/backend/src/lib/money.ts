// Money is integer VND everywhere. VNPay wants amount x100 and that happens only in toVnpAmount.
declare const vndBrand: unique symbol
export type Vnd = number & { readonly [vndBrand]: true }

export function Vnd(n: number): Vnd {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError(`VND must be a non-negative safe integer, got ${n}`)
  }
  return n as Vnd
}

const vndFormat = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })

/** 1500000 -> "1.500.000 ₫" */
export const formatVnd = (n: Vnd): string => vndFormat.format(n)

/** The VNPay adapter's only use: vnp_Amount = VND x 100. */
export function toVnpAmount(n: Vnd): number {
  const amount = n * 100
  if (!Number.isSafeInteger(amount)) throw new RangeError(`VNPay amount overflow for ${n}`)
  return amount
}
