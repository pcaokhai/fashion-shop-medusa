import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { data } from "@/lib/data";
import { checkout } from "@/lib/data/checkout";

export const metadata: Metadata = { title: "Thanh toán" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ pay?: string }> }) {
  const { pay } = await searchParams;
  const cart = await data.getCart();
  if (!cart?.items?.length) redirect("/cart");
  const [provinces, shippingOptions] = await Promise.all([checkout.listProvinces(), checkout.listShippingOptions()]);
  return (
    <div className="mx-auto max-w-[var(--layout-max)] px-4 py-6 pb-28 md:px-6 md:py-10 md:pb-10">
      <h1 className="mb-6 text-h2 font-bold text-heading">Thanh toán</h1>
      <CheckoutForm cart={cart} provinces={provinces} shippingOptions={shippingOptions} initialPayment={pay === "cod" || pay === "vnpay" ? pay : undefined} />
    </div>
  );
}
