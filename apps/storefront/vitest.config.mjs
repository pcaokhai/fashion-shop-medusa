import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["eslint/**/*.test.mjs", "src/**/*.test.{ts,tsx}"], passWithNoTests: false },
});
