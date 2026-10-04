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
  modules: redisUrl
    ? [
        { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl } },
        { resolve: "@medusajs/medusa/workflow-engine-redis", options: { redis: { redisUrl } } },
      ]
    : [],
})
