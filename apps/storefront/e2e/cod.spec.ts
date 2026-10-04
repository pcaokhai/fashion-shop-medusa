import { expect, test } from "@playwright/test";
import { checkoutAsGuest, fillCart } from "./helpers";

test("guest checks out with COD and sees the confirmation", async ({ page }) => {
  await page.goto("/");
  await fillCart(page);
  await checkoutAsGuest(page, "cod");
  await expect(page.getByRole("heading", { name: "Cảm ơn bạn đã đặt hàng!" })).toBeVisible();
  await expect(page.getByText("Trả tiền mặt khi nhận hàng")).toBeVisible();
});
