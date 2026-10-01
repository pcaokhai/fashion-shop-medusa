import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import vm from "node:vm";
import { expect, test, type APIRequestContext } from "@playwright/test";

const KB = 1024;
const HOME_BUDGET_KB = 170; // storefront CLAUDE.md, R-009-21
// R-009-25: /_design renders Reveal (~38 KB gz over the layout, R-009-24), so it is over the 170 KB budget by design;
// owner budget decision pending. This cap only catches regressions.
const DESIGN_CAP_KB = 215;
const DIST = join(__dirname, "../.next-e2e-prod");

const gzKb = async (request: APIRequestContext, urls: Iterable<string>) => {
  let bytes = 0;
  for (const u of urls) bytes += gzipSync(await (await request.get(u)).body()).length;
  return bytes / KB;
};

/** Client JS the production /_design page would load: its manifest chunks (a 404 loads none of them). */
function designChunks(): string[] {
  const sandbox: { __RSC_MANIFEST: Record<string, { entryJSFiles: Record<string, string[]> }> } = { __RSC_MANIFEST: {} };
  vm.runInNewContext(readFileSync(join(DIST, "server/app/_design/page_client-reference-manifest.js"), "utf8"), sandbox);
  const m = Object.values(sandbox.__RSC_MANIFEST)[0];
  if (!m) throw new Error("no client reference manifest");
  const key = Object.keys(m.entryJSFiles).find((k) => k.endsWith("%5Fdesign/page")) ?? "";
  return [...new Set([...Object.values(m.entryJSFiles).flat(), ...(m.entryJSFiles[key] ?? [])])].map((f) => `/_next/${f}`);
}

test("/_design is 404 in a production build", async ({ page }) => {
  const res = await page.goto("/_design");
  expect(res?.status()).toBe(404);
});

test("script bytes: / within 170 KB gz, /_design measured [R-009-21, R-009-25]", async ({ page, request }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const homeUrls: string[] = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((e) => new URL(e.name).pathname)
      .filter((p) => p.endsWith(".js")),
  );
  const home = await gzKb(request, homeUrls);
  const design = await gzKb(request, new Set([...homeUrls, ...designChunks()]));
  console.log(`SCRIPT_KB_GZ / = ${home.toFixed(1)}  /_design = ${design.toFixed(1)}`);
  expect(home).toBeLessThanOrEqual(HOME_BUDGET_KB);
  expect(design).toBeLessThanOrEqual(DESIGN_CAP_KB);
});
