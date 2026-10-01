import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const TOKENS = readFileSync(join(__dirname, "../../../packages/ui-kit/src/tokens.css"), "utf8");
const COLOUR_COUNT = [...TOKENS.matchAll(/^\s*--color-[a-z0-9-]+:\s*#/gm)].length;
const SHOTS = join(__dirname, "../../../.superpowers/sdd/VCK-009/screenshots");

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

test("Be Vietnam Pro renders the Vietnamese sample [VCK-009-AC3]", async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.querySelector('[data-testid="vi-sample"]') as HTMLElement;
    await document.fonts.ready; // loads only what rendered text uses: no explicit fonts.load
    const faces = [...document.fonts].filter((f) => f.family.replace(/['"]/g, "") === "Be Vietnam Pro");
    const cs = getComputedStyle(el);
    return {
      family: cs.fontFamily,
      loaded: faces.filter((f) => f.status === "loaded").map((f) => f.unicodeRange),
      all: faces.map((f) => f.unicodeRange),
      check: document.fonts.check(`${cs.fontWeight} 16px ${cs.fontFamily}`, el.textContent ?? ""),
    };
  });
  expect(r.family.replace(/['"]/g, "")).toMatch(/^Be Vietnam Pro/);
  expect(r.all.some((u) => /1EA0/i.test(u))).toBe(true);
  expect(r.loaded.some((u) => /1EA0/i.test(u))).toBe(true);
  expect(r.check).toBe(true);
});

test("Tab shows a visible ring in the ring colour on a button", async ({ page }) => {
  await page.keyboard.press("Tab");
  const r = await page.evaluate(() => {
    const probe = document.createElement("i");
    probe.style.color = "var(--color-ring)";
    document.body.append(probe);
    const ring = getComputedStyle(probe).color;
    probe.remove();
    const el = document.activeElement as Element;
    const cs = getComputedStyle(el);
    return { tag: el.tagName, style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), colour: cs.outlineColor, ring };
  });
  expect(r.tag).toBe("BUTTON");
  expect(r.style).not.toBe("none");
  expect(r.width).toBeGreaterThanOrEqual(2);
  expect(r.colour).toBe(r.ring);
});

test("full motion arms Reveal: below the fold it starts 16px down [control for reduced]", async ({ page }) => {
  const el = page.getByTestId("sample-reveal");
  expect(await el.evaluate((n) => getComputedStyle(n.parentElement as Element).transform)).toBe("matrix(1, 0, 0, 1, 0, 16)");
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
