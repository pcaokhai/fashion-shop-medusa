import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { createInventoryLevelsWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"
import setupStore from "../../src/scripts/setup-store"

type Api = { get: (u: string, c?: object) => Promise<{ data: any }>; post: (u: string, b?: object, c?: object) => Promise<{ data: any }> } // eslint-disable-line

// Minimal storefront: VN store basics plus one product with `stock` units at 100.000 VND. Returns what a checkout needs.
export async function bootstrapShop(container: MedusaContainer, stock: number) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const key = await setupStore({ container, args: [] })
  const firstId = async (entity: string) => (await query.graph({ entity, fields: ["id"] })).data[0]?.id as string
  const [channelId, profileId, locationId] = [await firstId("sales_channel"), await firstId("shipping_profile"), await firstId("stock_location")]
  await createProductsWorkflow(container).run({
    input: {
      products: [{
        title: "Test", handle: "test", status: "published", shipping_profile_id: profileId, sales_channels: [{ id: channelId }],
        options: [{ title: "Size", values: ["M"] }],
        variants: [{ title: "M", sku: "TEST-M", manage_inventory: true, options: { Size: "M" }, prices: [{ amount: 100000, currency_code: "vnd" }] }],
      }],
    },
  })
  const variant = (await query.graph({ entity: "product_variant", fields: ["id", "inventory_items.inventory_item_id"], filters: { sku: "TEST-M" } })).data[0]
  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: [{ inventory_item_id: variant?.inventory_items?.[0]?.inventory_item_id as string, location_id: locationId, stocked_quantity: stock }] },
  })
  return { key, headers: { "x-publishable-api-key": key }, variantId: variant?.id as string }
}

const ADDRESS = { first_name: "Mau", last_name: "Nguyen", address_1: "12 Duong Mau", city: "00004", province: "01", phone: "0900000001", country_code: "vn" }

/** Cart with one unit, shipping and a payment session of `provider`; stops before completing the cart. */
export async function readyCart(api: Api, shop: { headers: Record<string, string>; variantId: string }, email: string, provider: string) {
  const { headers } = shop
  const { data: { cart } } = await api.post("/store/carts", { region_id: "reg_vn", email }, { headers })
  await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: shop.variantId, quantity: 1 }, { headers })
  await api.post(`/store/carts/${cart.id}`, { shipping_address: ADDRESS, billing_address: ADDRESS }, { headers })
  const { data: { shipping_options } } = await api.get(`/store/shipping-options?cart_id=${cart.id}`, { headers })
  await api.post(`/store/carts/${cart.id}/shipping-methods`, { option_id: shipping_options[0].id }, { headers })
  const { data: { payment_collection } } = await api.post("/store/payment-collections", { cart_id: cart.id }, { headers })
  const { data } = await api.post(`/store/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: provider }, { headers })
  return { cartId: cart.id as string, session: data.payment_collection.payment_sessions.at(-1) as { id: string; data: Record<string, any> } } // eslint-disable-line
}
