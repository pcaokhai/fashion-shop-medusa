import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshCcw, Star, Truck, WalletCards } from "lucide-react";
import { BuyBox, type BuyVariant } from "@/components/product/BuyBox";
import { Gallery } from "@/components/product/Gallery";
import { ProductCard } from "@/components/product/ProductCard";
import { data } from "@/lib/data";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props) {
  const p = await data.getProduct((await params).handle);
  return { title: p?.title ?? "Không tìm thấy sản phẩm", ...(p?.description && { description: p.description }) };
}

export default async function ProductPage({ params }: Props) {
  const product = await data.getProduct((await params).handle);
  if (!product) notFound();

  const cat = product.categories?.[0];
  const variants: BuyVariant[] = (product.variants ?? []).map((v) => ({
    id: v.id, label: v.title ?? "", values: Object.fromEntries((v.options ?? []).map((o) => [o.option?.title ?? "", o.value])), price: v.calculated_price?.calculated_amount ?? 0,
    was: v.calculated_price?.original_amount ?? v.calculated_price?.calculated_amount ?? 0, stock: v.inventory_quantity ?? 0,
  }));
  const images = (product.images ?? []).map((i) => i.url);
  const related = cat ? (await data.listProducts({ category: cat.handle, limit: 5 })).products.filter((p) => p.id !== product.id).slice(0, 4) : [];
  const rating = Number(product.metadata?.rating ?? 0);
  const sold = Number(product.metadata?.sold ?? 0);

  return (
    <div className="mx-auto max-w-[var(--layout-max)] px-4 pb-20 md:px-6 md:pb-0">
      <nav aria-label="Breadcrumb" className="py-4 text-caption text-muted-foreground">
        <Link href="/" className="hover:underline">Trang chủ</Link>
        {cat && <> / <Link href={`/c/${cat.handle}`} className="hover:underline">{cat.name}</Link></>} / <span className="text-foreground">{product.title}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-7"><Gallery images={images.length ? images : [product.thumbnail ?? ""]} title={product.title} /></div>
        <div className="md:col-span-5">
          <div className="md:sticky md:top-24">
            <h1 className="text-h3 font-bold text-balance text-heading md:text-h2">{product.title}</h1>
            {rating > 0 && (
              <p className="mt-2 flex items-center gap-1 text-small text-muted-foreground">
                <Star className="size-4 fill-rating text-rating" aria-hidden /> <span className="font-medium text-foreground">{rating.toFixed(1)}</span> · Đã bán {sold}
              </p>
            )}
            <div className="mt-4"><BuyBox title={product.title} options={(product.options ?? []).map((o) => ({ title: o.title, values: (o.values ?? []).map((x) => x.value) }))} variants={variants} /></div>
            <ul className="mt-6 space-y-2 border-t border-border pt-4 text-small">
              <li className="flex items-center gap-2"><Truck className="size-5 text-primary" aria-hidden /> Giao 2–4 ngày, freeship từ 500.000 ₫</li>
              <li className="flex items-center gap-2"><RefreshCcw className="size-5 text-primary" aria-hidden /> Đổi trả trong 7 ngày</li>
              <li className="flex items-center gap-2"><WalletCards className="size-5 text-primary" aria-hidden /> COD hoặc VNPay</li>
            </ul>
          </div>
        </div>
      </div>

      <section aria-labelledby="desc-heading" className="mt-12 max-w-3xl">
        <h2 id="desc-heading" className="text-h4 font-bold text-heading">Mô tả sản phẩm</h2>
        <p className="mt-2 text-muted-foreground">{product.description}</p>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="rel-heading" className="mt-12">
          <h2 id="rel-heading" className="text-h3 font-bold text-heading">Có thể bạn cũng thích</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-x-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
