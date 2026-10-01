import { expect, test } from "@playwright/test";

test("reduced motion: Reveal is armed (hidden) with no translate, then fades in without one", async ({ page }) => {
  await page.goto("/_design", { waitUntil: "networkidle" }); // Reveal arms (remounts) after hydration
  const reveal = page.getByTestId("sample-reveal");
  const node = (el: typeof reveal) => el.evaluate((n) => {
    const p = n.parentElement as HTMLElement;
    const cs = getComputedStyle(p);
    return { motion: p.dataset.motion, opacity: cs.opacity, transform: cs.transform };
  });
  // before the reveal runs: armed (opacity 0) yet no translate; full motion shows a 16px translate here
  expect(await node(reveal)).toEqual({ motion: "reduced", opacity: "0", transform: "none" });

  await reveal.scrollIntoViewIfNeeded();
  const items = page.getByTestId("sample-stagger");
  await items.last().scrollIntoViewIfNeeded();
  for (const el of [reveal, ...(await items.all())]) {
    await expect(el).toBeVisible();
    await expect.poll(async () => (await node(el)).opacity).toBe("1");
    expect(await node(el)).toMatchObject({ motion: "reduced", transform: "none" });
  }
});
