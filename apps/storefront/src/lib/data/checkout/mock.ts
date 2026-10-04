import "server-only";
import { cookies } from "next/headers";
import shipping from "../../../../../../contracts/fixtures/medusa/shipping-options.json";
import { CART_COOKIE } from "../mock";
import { PROVINCES, wardsOf } from "./address-mock";
import type { CheckoutLayer } from "./types";

const IPN_COOKIE = "vck_mock_ipn"; // when the simulated gateway "IPN" was first seen
const IPN_DELAY_MS = 3000; // return page shows "đang xác nhận" for this long before the mock backend says paid

const cookieOpts = { path: "/", maxAge: 60 * 60, sameSite: "lax" } as const;
const newRef = () => `VCK-${Date.now().toString(36).toUpperCase().slice(-6)}`;

export const checkoutMock: CheckoutLayer = {
  listProvinces: () => Promise.resolve(PROVINCES),
  listWards: (province) => Promise.resolve(wardsOf(province)),
  listShippingOptions: () =>
    Promise.resolve(shipping.shipping_options.map((o) => ({ id: o.id, name: o.name, amount: o.calculated_price.calculated_amount }))),
  async placeOrder(input, { amount }) {
    const ref = newRef();
    if (input.payment === "cod") {
      (await cookies()).delete(CART_COOKIE);
      return { next: `/order/${ref}`, orderId: ref, ref };
    }
    return { next: `/checkout/mock-gateway?ref=${ref}&amount=${amount}`, orderId: null, ref };
  },
  async verifyVnpayReturn(query) {
    const ref = query.vnp_TxnRef ?? null;
    const base = { checksum_valid: true, cart_id: "cart_mock" };
    if (query.vnp_ResponseCode === "24") return { ...base, display_status: "CANCELLED_BY_USER", order_id: null };
    if (query.vnp_ResponseCode !== "00") return { ...base, display_status: "FAILED", order_id: null };
    const jar = await cookies();
    const first = Number(jar.get(IPN_COOKIE)?.value ?? 0) || Date.now();
    if (!jar.get(IPN_COOKIE)) jar.set(IPN_COOKIE, String(first), cookieOpts);
    const paid = Date.now() - first >= IPN_DELAY_MS;
    return { ...base, display_status: paid ? "PAID" : "PENDING_CONFIRMATION", order_id: paid ? ref : null };
  },
  async clearCart() {
    const jar = await cookies();
    jar.delete(CART_COOKIE);
    jar.delete(IPN_COOKIE);
  },
};
