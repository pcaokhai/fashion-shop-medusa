import Link from "next/link";
import { ArrowRight, Banknote, RefreshCcw, Truck, WalletCards } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { data } from "@/lib/data";
import { CATEGORY_TINT, SITE } from "@/lib/site";

const USP = [
  { icon: Truck, text: "Freeship từ 500.000 ₫" },
  { icon: Banknote, text: "COD toàn quốc" },
  { icon: RefreshCcw, text: "Đổi trả 7 ngày" },
  { icon: WalletCards, text: "VNPay / QR" },
];

export default async function HomePage() {
  const [categories, { products }, fresh] = await Promise.all([data.listCategories(), data.listProducts({ limit: 8 }), data.listProducts({ sort: "price-desc", limit: 8, offset: 8 })]);

  return (
    <>
      <section aria-labelledby="hero-heading" className="mx-auto max-w-[var(--layout-max)] px-4 pt-4 md:px-6 md:pt-6">
        <div className="grid overflow-hidden rounded-xl bg-cat-ao md:grid-cols-2">
          <div className="flex flex-col justify-center gap-4 p-6 md:p-12">
            <p className="text-small font-semibold tracking-wide text-cat-ao-ink uppercase">Bộ sưu tập Thu 2026</p>
            <h1 id="hero-heading" className="text-h2 font-bold text-balance text-heading md:text-display">{SITE.tagline}</h1>
            <p className="max-w-md text-lead text-muted-foreground">Chất liệu thoáng, form gọn, dễ phối. Giao nhanh 2–4 ngày, đổi trả trong 7 ngày.</p>
            <Link href="/c/all" className="inline-flex h-12 w-fit items-center gap-2 rounded-md bg-cta px-7 font-semibold text-on-primary hover:bg-cta-hover">
              Mua ngay <ArrowRight className="size-4" />
            </Link>
          </div>
          <img src="/mock/top-be-1.jpg" alt="" width={800} height={1000} fetchPriority="high" className="hidden h-full max-h-[28rem] w-full object-cover md:block" />
        </div>
      </section>

      <ul className="mx-auto mt-4 grid max-w-[var(--layout-max)] grid-cols-2 gap-x-4 px-4 md:mt-6 md:grid-cols-4 md:px-6">
        {USP.map(({ icon: Icon, text }) => (
          <li key={text} className="flex min-h-12 items-center gap-2 text-small font-medium">
            <Icon className="size-5 text-primary" aria-hidden /> {text}
          </li>
        ))}
      </ul>

      <section aria-labelledby="cats-heading" className="mx-auto mt-10 max-w-[var(--layout-max)] px-4 md:mt-16 md:px-6">
        <h2 id="cats-heading" className="text-h3 font-bold text-heading">Danh mục nổi bật</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {categories.filter((c) => !c.parent_category_id).map((c) => {
            const t = CATEGORY_TINT[c.handle] ?? "ao";
            return (
              <Link key={c.id} href={`/c/${c.handle}`} style={{ background: `var(--color-cat-${t})`, color: `var(--color-cat-${t}-ink)` }} className="flex aspect-[4/3] flex-col justify-end rounded-lg p-4 font-semibold transition-transform duration-[var(--dur-base)] hover:-translate-y-0.5 md:aspect-[3/4]">
                <span className="text-lead">{c.name}</span>
                <span className="text-caption font-medium opacity-80">Xem tất cả →</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="best-heading" className="mx-auto mt-10 max-w-[var(--layout-max)] px-4 md:mt-16 md:px-6">
        <h2 id="best-heading" className="text-h3 font-bold text-heading">Bán chạy</h2>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section aria-labelledby="new-heading" className="mx-auto mt-10 max-w-[var(--layout-max)] px-4 md:mt-16 md:px-6">
        <div className="flex items-end justify-between">
          <h2 id="new-heading" className="text-h3 font-bold text-heading">Hàng mới về</h2>
          <Link href="/c/all" className="text-small font-medium text-primary hover:underline">Xem tất cả →</Link>
        </div>
        <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-4 md:px-0">
          {fresh.products.map((p) => <div key={p.id} className="w-40 shrink-0 snap-start md:w-56"><ProductCard product={p} /></div>)}
        </div>
      </section>
    </>
  );
}
