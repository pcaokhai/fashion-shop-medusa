import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sign, verifySignature } from "../../src/lib/vnpay/sign"
import { bootstrapShop, readyCart } from "../helpers/shop"

const SECRET = "TESTSECRETVCK0000000000000000000"
process.env.VNPAY_TMN_CODE = "VCKTEST1"
process.env.VNPAY_HASH_SECRET = SECRET
process.env.VNPAY_PAY_URL = "https://sandbox.example.test/pay"
process.env.VNPAY_RETURN_URL = "https://shop.example.test/checkout/vnpay-return"

jest.setTimeout(120_000)

type Ack = { RspCode: string; Message: string }

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("VNPay payment truth", () => {
      let txn = 14_000_000
      const orders = async () => (await getContainer().resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "order", fields: ["id", "payment_collections.status", "payment_collections.captured_amount", "payment_collections.amount"] })).data

      // a cart with a VNPay session, plus helpers to craft the gateway's IPN / return query for it
      async function pending() {
        const shop = await bootstrapShop(getContainer(), 10)
        const { session, cartId } = await readyCart(api, shop, "khach@example.test", "pp_vnpay_vnpay")
        const url = new URL(session.data.payment_url as string)
        const pay = Object.fromEntries(url.searchParams)
        const result = (over: Record<string, string> = {}, secret = SECRET) => {
          const p = {
            vnp_Amount: pay.vnp_Amount, vnp_BankCode: "NCB", vnp_OrderInfo: pay.vnp_OrderInfo, vnp_PayDate: "20261001103512", vnp_ResponseCode: "00",
            vnp_TmnCode: pay.vnp_TmnCode, vnp_TransactionNo: String(++txn), vnp_TransactionStatus: "00", vnp_TxnRef: pay.vnp_TxnRef, ...over,
          } as Record<string, string>
          return { ...p, vnp_SecureHash: sign(p, secret) }
        }
        const ipn = async (params: Record<string, string>) => (await api.get("/hooks/vnpay/ipn", { params })).data as Ack
        const verifyReturn = async (query: Record<string, string>) => (await api.post("/store/payments/vnpay/verify-return", { query }, { headers: shop.headers })).data
        return { pay, cartId, result, ipn, verifyReturn }
      }

      it("builds a signed gateway URL with the amount times 100", async () => {
        const { pay } = await pending()
        expect(pay.vnp_Amount).toBe("13000000") // 100.000 item + 30.000 shipping
        expect(verifySignature(pay, SECRET)).toBe(true)
        expect(pay.vnp_TxnRef).toMatch(/^VCK[0-9A-Z]{20,}$/)
      })

      it("a verified successful IPN creates one paid order; the return page then says PAID", async () => {
        const { result, ipn, verifyReturn } = await pending()
        const ok = result()
        expect(await ipn(ok)).toMatchObject({ RspCode: "00" })
        const found = await orders()
        expect(found).toHaveLength(1)
        expect(found[0]?.payment_collections?.[0]).toMatchObject({ status: "completed", amount: 130000, captured_amount: 130000 })
        expect(await verifyReturn(ok)).toMatchObject({ checksum_valid: true, display_status: "PAID", order_id: found[0]?.id })
      })

      it("rejects a tampered body and a wrong secret and creates nothing", async () => {
        const { result, ipn } = await pending()
        expect((await ipn({ ...result(), vnp_Amount: "100" })).RspCode).toBe("97")
        expect((await ipn(result({}, "WRONGSECRETWRONGSECRET"))).RspCode).toBe("97")
        expect(await orders()).toHaveLength(0)
      })

      it("rejects a correctly signed IPN for the wrong amount and an unknown reference", async () => {
        const { result, ipn } = await pending()
        expect((await ipn(result({ vnp_Amount: "100" }))).RspCode).toBe("04")
        expect((await ipn(result({ vnp_TxnRef: "VCK00000000000000000000000000" }))).RspCode).toBe("01")
        expect(await orders()).toHaveLength(0)
      })

      it("a replayed IPN settles once", async () => {
        const { result, ipn } = await pending()
        const ok = result()
        expect((await ipn(ok)).RspCode).toBe("00")
        expect((await ipn(ok)).RspCode).toBe("02")
        expect(await orders()).toHaveLength(1)
      })

      it("concurrent duplicate IPNs settle once", async () => {
        const { result, ipn } = await pending()
        const ok = result()
        const acks = await Promise.all(Array.from({ length: 5 }, () => ipn(ok)))
        expect(acks.filter((a) => a.RspCode === "00")).toHaveLength(1)
        expect(acks.every((a) => ["00", "02"].includes(a.RspCode))).toBe(true)
        expect(await orders()).toHaveLength(1)
      })

      it("the return URL alone never marks anything paid", async () => {
        const { result, verifyReturn } = await pending()
        const browser = result() // signed success query, but the IPN never arrives
        expect(await verifyReturn(browser)).toMatchObject({ checksum_valid: true, display_status: "PENDING_CONFIRMATION", order_id: null })
        expect(await verifyReturn({ ...browser, vnp_Amount: "100" })).toMatchObject({ checksum_valid: false })
        expect(await orders()).toHaveLength(0)
      })

      it("a user-cancelled payment is acknowledged, creates no order and shows as cancelled", async () => {
        const { result, ipn, verifyReturn } = await pending()
        const cancelled = result({ vnp_ResponseCode: "24", vnp_TransactionStatus: "02", vnp_TransactionNo: "0" })
        expect((await ipn(cancelled)).RspCode).toBe("00")
        expect(await orders()).toHaveLength(0)
        expect(await verifyReturn(cancelled)).toMatchObject({ display_status: "CANCELLED_BY_USER", order_id: null })
      })
    })
  },
})
