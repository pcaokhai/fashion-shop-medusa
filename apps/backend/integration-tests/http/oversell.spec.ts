import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { bootstrapShop, readyCart } from "../helpers/shop"

jest.setTimeout(120_000)

type Res = { status: number; data: { type?: string } }

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("oversell", () => {
      it("two concurrent checkouts of the last unit give one order and one 409", async () => {
        const container = getContainer()
        const shop = await bootstrapShop(container, 1)

        // two shoppers each get the last unit into a cart, then both press "place order" at once
        const carts = [await readyCart(api, shop, "a@example.test", "pp_system_default"), await readyCart(api, shop, "b@example.test", "pp_system_default")]
        const complete = (id: string) =>
          api.post(`/store/carts/${id}/complete`, {}, { headers: shop.headers }).catch((e: { response: Res }) => e.response) as Promise<Res>
        const results = await Promise.all(carts.map((c) => complete(c.cartId)))

        expect(results.map((r) => r.status).sort()).toEqual([200, 409])
        expect(results.filter((r) => r.data.type === "order")).toHaveLength(1)
        const { data: orders } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "order", fields: ["id"] })
        expect(orders).toHaveLength(1)
      })
    })
  },
})
