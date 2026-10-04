import { Vnd, formatVnd, toVnpAmount } from "../money"

describe("money", () => {
  it.each([0, 1, 999_999_999])("keeps %i as an integer and multiplies by 100 for VNPay", (n) => {
    expect(toVnpAmount(Vnd(n))).toBe(n * 100)
  })

  it("formats VND with dot grouping and no decimals", () => {
    expect(formatVnd(Vnd(0))).toBe("0 ₫")
    expect(formatVnd(Vnd(999_999_999))).toBe("999.999.999 ₫")
  })

  it.each([1.5, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects %p", (n) => {
    expect(() => Vnd(n)).toThrow(RangeError)
  })

  it("rejects an amount whose x100 is not a safe integer", () => {
    expect(() => toVnpAmount(Vnd(Number.MAX_SAFE_INTEGER))).toThrow(RangeError)
  })
})
