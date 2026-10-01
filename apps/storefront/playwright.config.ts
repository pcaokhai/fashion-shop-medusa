import { defineConfig, devices } from "@playwright/test";

// Local-only (not in CI). reuseExistingServer is false: a busy port must fail loudly, never test another worktree's server. Dev needs network for Google Fonts: the AC3 font test is not weakened offline.
const DEV = "http://localhost:3100";
const PROD = "http://localhost:3101";
const use = { ...devices["Desktop Chrome"] };

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  reporter: [["list"]],
  webServer: [
    { command: "next dev -p 3100", url: `${DEV}/`, reuseExistingServer: false, timeout: 120_000 },
    {
      command: "next build && next start -p 3101",
      env: { NEXT_DIST_DIR: ".next-e2e-prod" },
      url: `${PROD}/`,
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
  projects: [
    { name: "dev", testMatch: "design.spec.ts", use: { ...use, baseURL: DEV } },
    { name: "reduced", testMatch: "reduced.spec.ts", use: { ...use, baseURL: DEV, reducedMotion: "reduce" } },
    { name: "prod", testMatch: "prod.spec.ts", use: { ...use, baseURL: PROD } },
  ],
});
