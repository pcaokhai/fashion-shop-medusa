import "server-only";
import { cookies } from "next/headers";
import { CART_COOKIE, cartId, store } from "../real";
import type { CheckoutLayer, ShippingOption, Unit } from "./types";

// Medusa store checkout flow: cart update → shipping method → payment session → complete (COD only).
// VNPay: the order is created by the verified IPN on the backend (rule 2); we only redirect to the gateway.
// ASSUMPTION (needs BE confirmation in the report): provider ids below and `payment_url` on the VNPay session data.
const COD_PROVIDER = process.env.NEXT_PUBLIC_COD_PROVIDER ?? "pp_system_default";
const VNPAY_PROVIDER = process.env.NEXT_PUBLIC_VNPAY_PROVIDER ?? "pp_vnpay_vnpay";

const need = async () => {
  const id = await cartId();
  if (!id) throw new Error("No cart");
  return id;
};

export const checkoutReal: CheckoutLayer = {
  async listProvinces() {
    return (await store<{ provinces: Unit[] }>("/vn-address/provinces")).provinces;
  },
  async listWards(province) {
    return (await store<{ wards: Unit[] }>(`/vn-address/provinces/${encodeURIComponent(province)}/wards`)).wards;
  },
  async listShippingOptions() {
    const id = await need();
    const { shipping_options } = await store<{ shipping_options: { id: string; name: string; amount?: number; calculated_price?: { calculated_amount: number } }[] }>(`/shipping-options?cart_id=${id}`);
    return shipping_options.map((o): ShippingOption => ({ id: o.id, name: o.name, amount: o.calculated_price?.calculated_amount ?? o.amount ?? 0 }));
  },
  async placeOrder(input, { addressLine }) {
    const id = await need();
    const [first = "", ...rest] = input.name.trim().split(/\s+/);
    const address = { first_name: rest.length ? rest.join(" ") : first, last_name: rest.length ? first : "", address_1: input.address, address_2: addressLine, city: input.wardCode, province: input.provinceCode, phone: input.phone, country_code: "vn" };
    await store(`/carts/${id}`, { method: "POST", body: JSON.stringify({ email: input.email, shipping_address: address, billing_address: address, metadata: { note: input.note } }) });
    await store(`/carts/${id}/shipping-methods`, { method: "POST", body: JSON.stringify({ option_id: input.shippingOptionId }) });
    const { payment_collection } = await store<{ payment_collection: { id: string } }>("/payment-collections", { method: "POST", body: JSON.stringify({ cart_id: id }) });
    const provider_id = input.payment === "cod" ? COD_PROVIDER : VNPAY_PROVIDER;
    const session = await store<{ payment_collection: { payment_sessions?: { data?: { payment_url?: string } }[] } }>(`/payment-collections/${payment_collection.id}/payment-sessions`, { method: "POST", body: JSON.stringify({ provider_id }) });
    if (input.payment === "vnpay") {
      const url = session.payment_collection.payment_sessions?.at(-1)?.data?.payment_url;
      if (!url) throw new Error("VNPay session has no payment_url");
      return { next: url, orderId: null, ref: id };
    }
    const done = await store<{ type: string; order?: { id: string; display_id: number } }>(`/carts/${id}/complete`, { method: "POST" });
    if (done.type !== "order" || !done.order) throw new Error("Cart did not complete");
    (await cookies()).delete(CART_COOKIE);
    return { next: `/order/${done.order.id}`, orderId: done.order.id, ref: `#${done.order.display_id}` };
  },
  async verifyVnpayReturn(query) {
    return store("/payments/vnpay/verify-return", { method: "POST", body: JSON.stringify({ query }) });
  },
  async clearCart() {
    (await cookies()).delete(CART_COOKIE);
  },
};
