import { expect, type Page } from "@playwright/test";

// Browse like a shopper: category → first product → add to cart. Resolves only once the add has finished
// (toast shown), so the next navigation cannot race the server action and open an empty cart.
export async function fillCart(page: Page) {
  await page.goto("/c/all");
  await page.locator('a[href^="/p/"]').first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /thêm vào giỏ/i }).click();
  await expect(page.getByText("Đã thêm vào giỏ hàng")).toBeVisible();
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
