import type { Metadata } from "next";
import { CartLines } from "@/components/cart/CartLines";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Giỏ hàng" };

export default async function CartPage() {
  const cart = await data.getCart();
  return (
    <div className="mx-auto flex max-w-2xl flex-col px-0 py-6 md:px-6 md:py-10">
      <h1 className="px-4 pb-4 text-h2 font-bold text-heading md:px-6">Giỏ hàng</h1>
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
        <CartLines cart={cart} />
      </div>
    </div>
  );
}
