import { expect, test } from "@playwright/test";

test("reduced motion: samples show with no transform", async ({ page }) => {
  await page.goto("/_design", { waitUntil: "networkidle" }); // Reveal arms (remounts) after hydration
  const reveal = page.getByTestId("sample-reveal");
  await reveal.scrollIntoViewIfNeeded();
  const items = page.getByTestId("sample-stagger");
  await items.last().scrollIntoViewIfNeeded();
  for (const el of [reveal, ...(await items.all())]) {
    await expect(el).toBeVisible();
    // the wrapping m.div is the animated node
    await expect.poll(() => el.evaluate((n) => getComputedStyle(n.parentElement as Element).opacity)).toBe("1");
    expect(await el.evaluate((n) => (n.parentElement as HTMLElement).dataset.motion)).toBe("reduced");
    expect(await el.evaluate((n) => getComputedStyle(n.parentElement as Element).transform)).toBe("none");
  }
});
