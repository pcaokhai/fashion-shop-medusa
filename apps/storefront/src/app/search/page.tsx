import Link from "next/link";
import { SearchInput } from "@/components/listing/SearchInput";
import { ProductCard } from "@/components/product/ProductCard";
import { data } from "@/lib/data";

export const metadata = { title: "Tìm kiếm" };
const LIMIT = 24;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  // empty query shows best sellers (pages/search.md); matching is accent-insensitive in the data layer
  const { products, count } = await data.listProducts({ ...(q && { q }), limit: LIMIT });

  return (
    <div className="mx-auto max-w-[var(--layout-max)] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-2xl"><SearchInput initial={q} /></div>
      <h1 className="mt-8 text-h4 font-bold text-heading" aria-live="polite">{q ? `${count} kết quả cho “${q}”` : "Bán chạy nhất"}</h1>
      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-h4 font-semibold">Không tìm thấy “{q}”</p>
          <p className="text-muted-foreground">Kiểm tra lại chính tả hoặc thử từ khoá ngắn hơn.</p>
          <Link href="/c/all" className="inline-flex h-11 items-center rounded-md bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover">Xem tất cả sản phẩm</Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-4 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
