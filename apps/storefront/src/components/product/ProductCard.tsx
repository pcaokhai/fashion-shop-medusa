import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/data";
import { formatVnd } from "@/lib/money";

export function ProductCard({ product }: { product: Product }) {
  const price = product.variants?.[0]?.calculated_price;
  const now = price?.calculated_amount ?? 0;
  const was = price?.original_amount ?? now;
  const onSale = was > now;
  const pct = onSale ? Math.round(((was - now) / was) * 100) : 0;
  const rating = Number(product.metadata?.rating ?? 0);
  const second = product.images?.[1]?.url;

  return (
    <Link href={`/p/${product.handle}`} className="group block" title={product.title}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
        <img src={product.thumbnail ?? ""} alt={product.title} width={800} height={1000} loading="lazy" className="size-full object-cover transition-transform duration-[var(--dur-slow)] group-hover:scale-105" />
        {second && (
          <img src={second} alt="" width={800} height={1000} loading="lazy" className="absolute inset-0 hidden size-full object-cover opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100 md:block" />
        )}
        {onSale && <Badge className="absolute top-3 left-3 bg-price-sale text-on-primary">-{pct}%</Badge>}
      </div>
      <h3 className="mt-3 line-clamp-2 text-small font-medium">{product.title}</h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className={`font-semibold ${onSale ? "text-price-sale" : ""}`}>{formatVnd(now)}</span>
        {onSale && <s className="text-caption text-muted-foreground">{formatVnd(was)}</s>}
      </p>
      {rating > 0 && (
        <p className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
          <Star className="size-3.5 fill-rating text-rating" aria-hidden /> {rating.toFixed(1)}
        </p>
      )}
    </Link>
  );
}
