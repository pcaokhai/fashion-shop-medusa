import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FilterBar } from "@/components/listing/FilterBar";
import { Pagination } from "@/components/listing/Pagination";
import { ProductCard } from "@/components/product/ProductCard";
import { data, type ProductSort } from "@/lib/data";
import { CATEGORY_TINT } from "@/lib/site";

const PAGE_SIZE = 12;
const SORTS: ProductSort[] = ["newest", "price-asc", "price-desc"];

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const cat = (await data.listCategories()).find((c) => c.handle === handle);
  return { title: cat?.name ?? "Tất cả sản phẩm" };
}

export default async function ListingPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const cats = await data.listCategories();
  const cat = cats.find((c) => c.handle === handle);
  if (handle !== "all" && !cat) notFound();

  const page = Math.max(1, Number(sp.page) || 1);
  const sort = SORTS.find((s) => s === sp.sort) ?? "newest";
  const max = Number(sp.max) || undefined;
  const { products, count } = await data.listProducts({
    ...(cat && { category: cat.handle }), sort, onSale: !!sp.sale, inStock: !!sp.stock, ...(max !== undefined && { maxPrice: max }),
    limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
  });

  const tint = CATEGORY_TINT[handle];
  const query = Object.fromEntries(Object.entries(sp).filter(([k, v]) => k !== "page" && v)) as Record<string, string>;
  const title = cat?.name ?? "Tất cả sản phẩm";

  return (
    <div className="mx-auto max-w-[var(--layout-max)] px-4 md:px-6">
      <section style={tint ? { background: `var(--color-cat-${tint})`, color: `var(--color-cat-${tint}-ink)` } : undefined} className={`mt-4 rounded-xl p-6 md:mt-6 md:p-10 ${tint ? "" : "bg-cat-all text-cat-all-ink"}`}>
        <nav aria-label="Breadcrumb" className="text-caption opacity-80"><Link href="/" className="hover:underline">Trang chủ</Link> / {title}</nav>
        <h1 className="mt-2 text-h2 font-bold md:text-h1">{title}</h1>
        <p className="mt-1 max-w-xl opacity-90">{cat?.description ?? "Toàn bộ sản phẩm của cửa hàng."}</p>
        <ul className="mt-5 flex gap-2 overflow-x-auto">
          {[{ handle: "all", name: "Tất cả" }, ...cats].map((c) => (
            <li key={c.handle}>
              <Link href={`/c/${c.handle}`} aria-current={c.handle === handle ? "page" : undefined} className={`inline-flex h-9 items-center rounded-full border px-4 text-small font-medium whitespace-nowrap ${c.handle === handle ? "border-2 border-current bg-card/60" : "border-transparent bg-card/50 hover:bg-card/80"}`}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4">
        <Suspense fallback={null}><FilterBar total={count} /></Suspense>
      </div>

      {products.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-h4 font-semibold">Không có sản phẩm phù hợp</p>
          <p className="text-muted-foreground">Thử bỏ bớt bộ lọc để xem thêm sản phẩm.</p>
          <Link href={`/c/${handle}`} className="inline-flex h-11 items-center rounded-md bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover">Xoá tất cả bộ lọc</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-4 lg:grid-cols-4 min-[90rem]:grid-cols-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      <Pagination page={page} pages={Math.ceil(count / PAGE_SIZE)} from={(page - 1) * PAGE_SIZE + 1} to={Math.min(page * PAGE_SIZE, count)} total={count} basePath={`/c/${handle}`} query={query} />
    </div>
  );
}
