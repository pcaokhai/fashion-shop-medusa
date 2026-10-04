"use server";
import { cookies } from "next/headers";
import { data } from ".";
import { checkout } from "./checkout";
import type { CheckoutInput, OrderSnapshot, PaymentReturnStatus } from "./checkout";
import { isVnPhone } from "../phone";

export type PlaceResult = { ok: true; next: string } | { ok: false; errors: Partial<Record<keyof CheckoutInput | "form", string>> };

import { SNAPSHOT_COOKIE } from "./checkout/constants";
const MAX_SNAPSHOT_ITEMS = 6; // cookie size budget

export async function loadWards(provinceCode: string) {
  return checkout.listWards(provinceCode);
}

// Server-side check of the same rules as the client: required fields + phone format. The backend validates the rest.
function validate(i: CheckoutInput): PlaceResult | null {
  const errors: Partial<Record<keyof CheckoutInput, string>> = {};
  if (!i.name?.trim()) errors.name = "Nhập họ tên người nhận";
  if (!isVnPhone(i.phone ?? "")) errors.phone = "Số điện thoại chưa đúng";
  if (!i.email?.includes("@")) errors.email = "Nhập email để nhận thông báo đơn hàng";
  if (!i.provinceCode) errors.provinceCode = "Chọn tỉnh/thành phố";
  if (!i.wardCode) errors.wardCode = "Chọn phường/xã";
  if (!i.address?.trim()) errors.address = "Nhập số nhà, tên đường";
  if (i.payment !== "cod" && i.payment !== "vnpay") errors.payment = "Chọn phương thức thanh toán";
  return Object.keys(errors).length ? { ok: false, errors } : null;
}

export async function placeOrder(input: CheckoutInput): Promise<PlaceResult> {
  const invalid = validate(input);
  if (invalid) return invalid;
  try {
    const [cart, provinces, wards, options] = await Promise.all([
      data.getCart(),
      checkout.listProvinces(),
      checkout.listWards(input.provinceCode),
      checkout.listShippingOptions(),
    ]);
    if (!cart?.items?.length) return { ok: false, errors: { form: "Giỏ hàng đang trống" } };
    const option = options.find((o) => o.id === input.shippingOptionId) ?? options[0];
    if (!option) return { ok: false, errors: { form: "Chưa có phương thức vận chuyển" } };
    const province = provinces.find((p) => p.code === input.provinceCode)?.name ?? "";
    const ward = wards.find((w) => w.code === input.wardCode)?.name ?? "";
    const addressLine = [input.address.trim(), ward, province].filter(Boolean).join(", ");
    const subtotal = cart.subtotal ?? 0;
    const result = await checkout.placeOrder({ ...input, shippingOptionId: option.id }, { addressLine, amount: subtotal + option.amount });
    const snapshot: OrderSnapshot = {
      id: result.orderId,
      ref: result.ref,
      payment: input.payment,
      subtotal,
      shipping: option.amount,
      total: subtotal + option.amount,
      items: (cart.items ?? []).slice(0, MAX_SNAPSHOT_ITEMS).map((l) => ({ title: l.product_title ?? l.title, variant: l.variant_title ?? "", quantity: l.quantity, unit: l.unit_price })),
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      addressLine,
      shippingName: option.name,
    };
    (await cookies()).set(SNAPSHOT_COOKIE, JSON.stringify(snapshot), { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax" });
    return { ok: true, next: result.next };
  } catch (e) {
    console.error("placeOrder failed", e instanceof Error ? e.message : e); // no payload: it carries phone and address
    return { ok: false, errors: { form: "Không đặt được hàng. Vui lòng thử lại sau ít phút." } };
  }
}

/** Display only. On PAID we drop the cart cookie; the order itself was completed by the backend's IPN. */
export async function pollVnpay(query: Record<string, string>): Promise<PaymentReturnStatus | null> {
  try {
    const status = await checkout.verifyVnpayReturn(query);
    if (status.display_status === "PAID") await checkout.clearCart();
    return status;
  } catch (e) {
    console.error("verify-return failed", e instanceof Error ? e.message : e);
    return null;
  }
}
