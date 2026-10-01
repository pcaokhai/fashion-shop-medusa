import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const TOKENS = readFileSync(join(__dirname, "../../../packages/ui-kit/src/tokens.css"), "utf8");
const COLOUR_COUNT = [...TOKENS.matchAll(/^\s*--color-[a-z-]+:\s*#/gm)].length;
const SHOTS = join(__dirname, "../../../.superpowers/sdd/VCK-009/screenshots");
const SAMPLE = "Ưu đãi đặc biệt – Giảm 30% – Đồng hồ";

test.beforeEach(async ({ page }) => {
  await page.goto("/_design", { waitUntil: "networkidle" }); // Reveal arms (remounts) after hydration
});

test("renders every colour token swatch", async ({ page }) => {
  expect(COLOUR_COUNT).toBeGreaterThan(20);
  await expect(page.getByTestId("swatch")).toHaveCount(COLOUR_COUNT);
});

test("renders type scale, button/badge/chip specimens and motion samples", async ({ page }) => {
  await expect(page.getByTestId("type-row")).toHaveCount(9);
  await expect(page.getByTestId("btn")).toHaveCount(5);
  await expect(page.getByTestId("badge")).toHaveCount(1);
  await expect(page.getByTestId("chip")).toHaveCount(2);
  await expect(page.getByTestId("sample-reveal")).toHaveCount(1);
  await expect(page.getByTestId("sample-stagger")).toHaveCount(4);
});

test("Be Vietnam Pro loads with the Vietnamese range [VCK-009-AC3]", async ({ page }) => {
  const r = await page.evaluate(async (sample) => {
    await document.fonts.load('600 16px "Be Vietnam Pro"', sample);
    await document.fonts.ready;
    const faces = [...document.fonts].filter((f) => f.family.replace(/['"]/g, "") === "Be Vietnam Pro");
    return {
      loaded: faces.filter((f) => f.status === "loaded").map((f) => f.unicodeRange),
      all: faces.map((f) => f.unicodeRange),
      check: document.fonts.check('600 16px "Be Vietnam Pro"', sample),
    };
  }, SAMPLE);
  expect(r.all.length).toBeGreaterThan(0);
  expect(r.all.some((u) => /1EA0/i.test(u))).toBe(true);
  expect(r.loaded.some((u) => /1EA0/i.test(u))).toBe(true);
  expect(r.check).toBe(true);
});

test("Tab shows the ring colour", async ({ page }) => {
  await page.keyboard.press("Tab");
  const { outline, ring } = await page.evaluate(() => {
    const probe = document.createElement("i");
    probe.style.color = "var(--color-ring)";
    document.body.append(probe);
    const ring = getComputedStyle(probe).color;
    probe.remove();
    return { outline: getComputedStyle(document.activeElement as Element).outlineColor, ring };
  });
  expect(outline).toBe(ring);
});

test("screenshots at 375/768/1440", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByTestId("sample-reveal").scrollIntoViewIfNeeded();
    await page.waitForTimeout(700); // reveal settles; not an assertion
    await page.screenshot({ path: join(SHOTS, `design-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
