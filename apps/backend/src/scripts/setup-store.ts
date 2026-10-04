/**
 * B0: VN store basics, idempotent. `npx medusa exec ./src/scripts/setup-store.ts`
 * Region reg_vn (VND, tax inclusive), one sales channel, one publishable key linked to it.
 * Prints the key as `PUBLISHABLE_KEY=pk_...` for the storefront env.
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const REGION_ID = "reg_vn"
const CHANNEL_NAME = "VCK Web"
const KEY_TITLE = "VCK Storefront"

export default async function setupStore({ container }: ExecArgs) {
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

  logger.info(`PUBLISHABLE_KEY=${key.token}`)
}
