import type { Metadata } from "next";
import { VnpayReturn } from "@/components/checkout/VnpayReturn";

export const metadata: Metadata = { title: "Xác nhận thanh toán" };

type Search = Record<string, string | string[] | undefined>;

export default async function VnpayReturnPage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  const query = Object.fromEntries(Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <div className="px-4 py-16 md:py-24">
      <VnpayReturn query={query} />
    </div>
  );
}
