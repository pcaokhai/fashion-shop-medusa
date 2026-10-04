/**
 * B0: VN store basics, idempotent. `npx medusa exec ./src/scripts/setup-store.ts`
 * Region reg_vn (VND, tax inclusive), one sales channel, one publishable key linked to it,
 * one stock location with a VN service zone and a flat-rate shipping option (30.000 ₫).
 * Prints the key as `PUBLISHABLE_KEY=pk_...` for the storefront env.
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const REGION_ID = "reg_vn"
const CHANNEL_NAME = "VCK Web"
const KEY_TITLE = "VCK Storefront"
const LOCATION_NAME = "Kho TP.HCM"
const FLAT_SHIPPING_VND = 30_000

export default async function setupStore({ container }: ExecArgs): Promise<string> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricing = container.resolve(Modules.PRICING)

  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id"], filters: { name: CHANNEL_NAME } })
  let channelId = channels[0]?.id
  if (!channelId) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: CHANNEL_NAME, description: "Storefront" }] },
    })
    channelId = result[0]?.id
  }
  if (!channelId) throw new Error("sales channel missing")

  const { data: stores } = await query.graph({ entity: "store", fields: ["id"] })
  const storeId = stores[0]?.id
  if (!storeId) throw new Error("store missing (run db:migrate first)")
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: storeId },
      update: {
        name: "VN Commerce Kit",
        supported_currencies: [{ currency_code: "vnd", is_default: true }],
        default_sales_channel_id: channelId,
      },
    },
  })

  const { data: regions } = await query.graph({ entity: "region", fields: ["id"], filters: { id: REGION_ID } })
  if (!regions.length) {
    // the module accepts a fixed id, the workflow's literal type just does not list it; a variable skips the excess-property check
    const regionInput = { id: REGION_ID, name: "Việt Nam", currency_code: "vnd", countries: ["vn"], payment_providers: ["pp_system_default"] }
    await createRegionsWorkflow(container).run({ input: { regions: [regionInput] } })
    await createTaxRegionsWorkflow(container).run({ input: [{ country_code: "vn", provider_id: "tp_system" }] })
  }

  const prefs = await pricing.listPricePreferences({ attribute: "region_id", value: REGION_ID })
  if (!prefs.length) {
    await pricing.createPricePreferences({ attribute: "region_id", value: REGION_ID, is_tax_inclusive: true })
  }

  const { data: keys } = await query.graph({ entity: "api_key", fields: ["id", "token"], filters: { title: KEY_TITLE, type: "publishable" } })
  let key: { id: string; token: string } | undefined = keys[0]
  if (!key) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: KEY_TITLE, type: "publishable", created_by: "" }] },
    })
    key = result[0]
  }
  if (!key) throw new Error("publishable key missing")
  await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: key.id, add: [channelId] } })

  await setupFulfillment(container, channelId)

  logger.info(`PUBLISHABLE_KEY=${key.token}`)
  return key.token
}

async function setupFulfillment(container: ExecArgs["container"], channelId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillment = container.resolve(Modules.FULFILLMENT)

  const { data: locations } = await query.graph({ entity: "stock_location", fields: ["id"], filters: { name: LOCATION_NAME } })
  if (locations.length) return

  const { result } = await createStockLocationsWorkflow(container).run({
    input: { locations: [{ name: LOCATION_NAME, address: { city: "TP. Hồ Chí Minh", country_code: "VN", address_1: "Địa chỉ kho mẫu" } }] },
  })
  const location = result[0]
  if (!location) throw new Error("stock location missing")

  // a core migration script creates the default profile on a real DB; fresh test databases only have the schema
  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  const profile =
    profiles[0] ?? (await createShippingProfilesWorkflow(container).run({ input: { data: [{ name: "Default Shipping Profile", type: "default" }] } })).result[0]
  if (!profile) throw new Error("shipping profile missing")

  const set = await fulfillment.createFulfillmentSets({
    name: "Giao hàng toàn quốc",
    type: "shipping",
    service_zones: [{ name: "Việt Nam", geo_zones: [{ country_code: "vn", type: "country" }] }],
  })
  const zone = set.service_zones[0]
  if (!zone) throw new Error("service zone missing")

  await link.create({ [Modules.STOCK_LOCATION]: { stock_location_id: location.id }, [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" } })
  await link.create({ [Modules.STOCK_LOCATION]: { stock_location_id: location.id }, [Modules.FULFILLMENT]: { fulfillment_set_id: set.id } })
  await linkSalesChannelsToStockLocationWorkflow(container).run({ input: { id: location.id, add: [channelId] } })

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Giao hàng tiêu chuẩn",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: zone.id,
        shipping_profile_id: profile.id,
        type: { label: "Tiêu chuẩn", description: "Giao trong 2-4 ngày.", code: "standard" },
        prices: [
          { currency_code: "vnd", amount: FLAT_SHIPPING_VND },
          { region_id: REGION_ID, amount: FLAT_SHIPPING_VND },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })
}
