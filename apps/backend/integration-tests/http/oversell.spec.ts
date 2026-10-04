import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"
import setupStore from "../../src/scripts/setup-store"

jest.setTimeout(120_000)

type Res = { status: number; data: { type?: string; order?: { id: string } } }

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("oversell", () => {
      it("two concurrent checkouts of the last unit give one order and one 409", async () => {
        const container = getContainer()
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const key = await setupStore({ container, args: [] })
        const headers = { "x-publishable-api-key": key }
        const call = (p: Promise<Res>) => p.catch((e: { response: Res }) => e.response)

        const firstId = async (entity: string) => (await query.graph({ entity, fields: ["id"] })).data[0]?.id as string
        const [channelId, profileId, locationId] = [await firstId("sales_channel"), await firstId("shipping_profile"), await firstId("stock_location")]
        await createProductsWorkflow(container).run({
          input: {
            products: [{
              title: "Last unit", handle: "last-unit", status: "published", shipping_profile_id: profileId, sales_channels: [{ id: channelId }],
              options: [{ title: "Size", values: ["M"] }],
              variants: [{ title: "M", sku: "LAST-M", manage_inventory: true, options: { Size: "M" }, prices: [{ amount: 100000, currency_code: "vnd" }] }],
            }],
          },
        })
        const variant = (await query.graph({ entity: "product_variant", fields: ["id", "inventory_items.inventory_item_id"], filters: { sku: "LAST-M" } })).data[0]
        await createInventoryLevelsWorkflow(container).run({
          input: { inventory_levels: [{ inventory_item_id: variant?.inventory_items?.[0]?.inventory_item_id as string, location_id: locationId, stocked_quantity: 1 }] },
        })

        // two shoppers each get the last unit into a cart, then both press "place order" at once
        const address = { first_name: "Mau", last_name: "Nguyen", address_1: "12 Duong Mau", city: "x", province: "HCM", phone: "0900000001", country_code: "vn" }
        const readyCart = async (email: string) => {
          const { data: { cart } } = await api.post("/store/carts", { region_id: "reg_vn", email }, { headers })
          await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: variant?.id, quantity: 1 }, { headers })
          await api.post(`/store/carts/${cart.id}`, { shipping_address: address, billing_address: address }, { headers })
          const { data: { shipping_options } } = await api.get(`/store/shipping-options?cart_id=${cart.id}`, { headers })
          await api.post(`/store/carts/${cart.id}/shipping-methods`, { option_id: shipping_options[0].id }, { headers })
          const { data: { payment_collection } } = await api.post("/store/payment-collections", { cart_id: cart.id }, { headers })
          await api.post(`/store/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: "pp_system_default" }, { headers })
          return cart.id as string
        }
        const carts = [await readyCart("a@example.test"), await readyCart("b@example.test")]

        const results = await Promise.all(carts.map((id) => call(api.post(`/store/carts/${id}/complete`, {}, { headers }))))

        expect(results.map((r) => r.status).sort()).toEqual([200, 409])
        expect(results.filter((r) => r.data.type === "order")).toHaveLength(1)
        const { data: orders } = await query.graph({ entity: "order", fields: ["id"] })
        expect(orders).toHaveLength(1)
      })
    })
  },
})
