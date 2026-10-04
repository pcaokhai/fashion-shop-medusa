import { expect, test } from "@playwright/test";
import { checkoutAsGuest, fillCart } from "./helpers";

// The gateway page is the VNPay simulator (real stack) or /checkout/mock-gateway (mock mode); both expose a
// "Thanh toán thành công" outcome control. The return page may only show "đang xác nhận" until the backend says paid.
test("guest pays with VNPay sandbox: pending, then confirmation once the backend says paid", async ({ page }) => {
  await page.goto("/");
  await fillCart(page);
  await checkoutAsGuest(page, "vnpay");
  await page.getByRole("link", { name: /thanh toán thành công/i }).or(page.getByRole("button", { name: /thanh toán thành công/i })).click();
  await expect(page.getByRole("heading", { name: /Đang xác nhận thanh toán/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cảm ơn bạn đã đặt hàng!" })).toBeVisible({ timeout: 30_000 });
});

test("cancelled VNPay payment keeps the cart and offers a retry", async ({ page }) => {
  await page.goto("/");
  await fillCart(page);
  await checkoutAsGuest(page, "vnpay");
  await page.getByRole("link", { name: /hủy giao dịch/i }).or(page.getByRole("button", { name: /hủy giao dịch/i })).click();
  await expect(page.getByRole("heading", { name: "Bạn đã hủy thanh toán" })).toBeVisible();
  await page.getByRole("link", { name: "Thử lại với VNPay" }).click();
  await expect(page.getByLabel("Họ và tên")).toHaveValue("Nguyễn Văn Mẫu");
});
