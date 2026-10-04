import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page } from "@playwright/test";

const MOCK = process.env.E2E_API_MODE === "mock";

// ponytail: mock mode seeds the cookie cart (its documented storage); real mode walks the UI.
// Drop the mock branch once WEB-1's listing/PDP are on main and green in mock mode.
export async function fillCart(page: Page) {
  if (MOCK) {
    const fixture = resolve(process.cwd(), "../../contracts/fixtures/medusa/products.json"); // playwright runs from apps/storefront
    const variantId = (JSON.parse(readFileSync(fixture, "utf8")) as { products: { variants: { id: string }[] }[] }).products[0]?.variants[0]?.id ?? "";
    await page.context().addCookies([{ name: "vck_mock_cart", value: encodeURIComponent(JSON.stringify([{ variantId, quantity: 1 }])), url: page.url() === "about:blank" ? (process.env.E2E_BASE_URL ?? "http://localhost:8000") : page.url() }]);
    return;
  }
  await page.goto("/c/all");
  await page.locator('a[href^="/p/"]').first().click();
  await page.getByRole("button", { name: /thêm vào giỏ/i }).click();
}

export async function checkoutAsGuest(page: Page, payment: "cod" | "vnpay") {
  await page.goto("/cart");
  await page.getByRole("link", { name: "Thanh toán", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thanh toán", level: 1 })).toBeVisible();

  await page.getByLabel("Họ và tên").fill("Nguyễn Văn Mẫu");
  await page.getByLabel("Số điện thoại").fill("0912345678");
  await page.getByLabel("Email").fill("khach@example.test");
  await page.getByRole("combobox", { name: "Tỉnh / Thành phố" }).click();
  await page.getByPlaceholder(/gõ để tìm/i).fill("ho chi minh"); // accent-insensitive
  await page.getByRole("option", { name: /Hồ Chí Minh/ }).click();
  await page.getByRole("combobox", { name: "Phường / Xã" }).click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Số nhà, tên đường").fill("12 Đường Mẫu");
  await page.getByRole("button", { name: "Tiếp tục" }).click(); // → shipping
  await page.getByRole("button", { name: "Tiếp tục" }).click(); // → payment
  await page.getByRole("radio", { name: new RegExp(payment === "cod" ? "COD" : "VNPay") }).click();
  await page.getByRole("button", { name: /^Đặt hàng/ }).click();
}
