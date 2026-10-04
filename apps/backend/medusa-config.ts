import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const redisUrl = process.env.REDIS_URL

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl,
    // server | worker | shared (default: one process does both, as in `pnpm dev`)
    workerMode: (process.env.MEDUSA_WORKER_MODE as "server" | "worker" | "shared" | undefined) ?? "shared",
    http: {
      storeCors: process.env.STORE_CORS ?? "",
      adminCors: process.env.ADMIN_CORS ?? "",
      authCors: process.env.AUTH_CORS ?? "",
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  },
  modules: [
    // pp_vnpay_vnpay next to the built-in pp_system_default (COD)
    { resolve: "@medusajs/medusa/payment", options: { providers: [{ resolve: "./src/modules/vnpay", id: "vnpay" }] } },
    { resolve: "./src/modules/vnpay-ipn" },
    // product photos on local disk; BACKEND_URL is the public origin of this server (https://api.<domain> in prod)
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: { upload_dir: process.env.FILE_UPLOAD_DIR ?? "static", backend_url: `${process.env.BACKEND_URL ?? "http://localhost:9000"}/static` },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/meilisearch",
      options: { host: process.env.MEILI_HOST ?? "http://localhost:7700", apiKey: process.env.MEILI_MASTER_KEY ?? "dev-only-meili-key", indexName: "products" },
    },
    ...(redisUrl
      ? [
          { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl } },
          { resolve: "@medusajs/medusa/workflow-engine-redis", options: { redis: { redisUrl } } },
        ]
      : []),
  ],
})
