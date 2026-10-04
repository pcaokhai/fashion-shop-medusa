import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { buildSignData, formatVnpDate, sign, verifySignature } from "../sign"

type Vector = { name: string; params: Record<string, string>; sign_data?: string; vnp_SecureHash?: string; expect_valid?: boolean }
const golden = JSON.parse(readFileSync(resolve(__dirname, "../../../../../../contracts/vnpay/golden-vectors.json"), "utf8")) as {
  secret: string
  vectors: Vector[]
}

describe("VNPay golden vectors", () => {
  it.each(golden.vectors.filter((v) => v.sign_data))("$name: sign data and hash match", (v) => {
    expect(buildSignData(v.params)).toBe(v.sign_data)
    expect(sign(v.params, golden.secret)).toBe(v.vnp_SecureHash)
    expect(verifySignature({ ...v.params, vnp_SecureHash: v.vnp_SecureHash ?? "" }, golden.secret)).toBe(true)
  })

  it.each(golden.vectors.filter((v) => v.expect_valid === false))("$name is rejected", (v) => {
    expect(verifySignature(v.params, golden.secret)).toBe(false)
  })

  it("rejects a valid hash under the wrong secret and a missing hash", () => {
    const v = golden.vectors.find((x) => x.name === "ipn_success") as Vector
    expect(verifySignature({ ...v.params, vnp_SecureHash: v.vnp_SecureHash ?? "" }, "WRONGSECRET")).toBe(false)
    expect(verifySignature(v.params, golden.secret)).toBe(false)
  })

  it("formats dates in Vietnam time", () => {
    expect(formatVnpDate(new Date("2026-10-01T03:30:00Z"))).toBe("20261001103000")
  })
})
