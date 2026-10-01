import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const KB = 1024;
// R-009-25 metric: bytes Chrome actually downloads for `/` (gzip -9 of the .js resources it requests; excludes the
// noModule polyfills chunk). Measured 130.6 KB; cap = measurement + ~10% slack. The HTML script-set metric
// (incl. noModule, the R-009-21 "first-load JS") is 168.9 KB and is recorded in PROGRESS, not asserted here.
const HOME_CHROME_CAP_KB = 145;
const DIST = join(__dirname, "../.next-e2e-prod");

test("/_design is 404 in a production build", async ({ page }) => {
  const res = await page.goto("/_design");
  expect(res?.status()).toBe(404);
});

test("production manifests have no /_design route or files [R-009-25]", () => {
  for (const m of ["server/app-paths-manifest.json", "app-path-routes-manifest.json", "routes-manifest.json"]) {
    const f = join(DIST, m);
    if (existsSync(f)) expect(readFileSync(f, "utf8"), m).not.toMatch(/_design/);
  }
  expect(existsSync(join(DIST, "server/app/_design")), "no prerendered/compiled /_design").toBe(false);
  expect(existsSync(join(DIST, "server/app-paths-manifest.json")), "manifest was read").toBe(true);
});

test("Chrome-downloaded script bytes of / (gzip -9) stay within cap [R-009-21, R-009-25]", async ({ page, request }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const urls: string[] = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((e) => new URL(e.name).pathname)
      .filter((p) => p.endsWith(".js")),
  );
  let bytes = 0;
  for (const u of urls) bytes += gzipSync(await (await request.get(u)).body(), { level: 9 }).length;
  console.log(`SCRIPT_KB_GZ9 (Chrome download) / = ${(bytes / KB).toFixed(1)}`);
  expect(bytes / KB).toBeLessThanOrEqual(HOME_CHROME_CAP_KB);
});
