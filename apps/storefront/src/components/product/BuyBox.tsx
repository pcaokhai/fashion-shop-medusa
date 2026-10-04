"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useMotionPrefs } from "@vck/ui-kit";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/data/cart-actions";
import { formatVnd } from "@/lib/money";
import { cn } from "@/lib/utils";

export type BuyVariant = { id: string; label: string; values: Record<string, string>; price: number; was: number; stock: number };
export type BuyOption = { title: string; values: string[] };

export function BuyBox({ title, options, variants }: { title: string; options: BuyOption[]; variants: BuyVariant[] }) {
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [chosen, setChosen] = useState<Record<string, string>>(firstAvailable?.values ?? {});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { reduced } = useMotionPrefs();
  const v = variants.find((x) => options.every((o) => x.values[o.title] === chosen[o.title])) ?? firstAvailable;
  // a value is offered when some in stock variant has it together with the other current choices
  const available = (title: string, value: string) => variants.some((x) => x.stock > 0 && x.values[title] === value && options.every((o) => o.title === title || x.values[o.title] === chosen[o.title]));
  const pick = (title: string, value: string) => {
    const exact = variants.find((x) => x.values[title] === value && options.every((o) => o.title === title || x.values[o.title] === chosen[o.title]));
    setChosen((exact ?? variants.find((x) => x.stock > 0 && x.values[title] === value) ?? variants.find((x) => x.values[title] === value))?.values ?? chosen);
    setQty(1);
  };
  if (!v) return <p className="text-muted-foreground">Sản phẩm tạm thời chưa bán.</p>;
  const soldOut = v.stock <= 0;
  const onSale = v.was > v.price;

  const add = () =>
    start(async () => {
      try {
        await addToCart(v.id, qty);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
        toast.success("Đã thêm vào giỏ hàng", { description: `${title} · ${v.label} × ${qty}`, action: { label: "Xem giỏ", onClick: () => router.push("/cart") } });
      } catch {
        toast.error("Không thêm được vào giỏ. Vui lòng thử lại.");
      }
    });

  const buyNow = () =>
    start(async () => {
      try {
        await addToCart(v.id, qty);
        router.push("/checkout");
      } catch {
        toast.error("Không thêm được vào giỏ. Vui lòng thử lại.");
      }
    });

  const cta = (
    <Button variant="cta" size="lg" className="w-full" disabled={soldOut || pending} aria-busy={pending} onClick={add}>
      <motion.span key={String(added)} initial={reduced ? false : { scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2">
        {added ? <Check /> : <ShoppingBag />} {soldOut ? "Hết hàng" : added ? "Đã thêm" : "Thêm vào giỏ"}
      </motion.span>
    </Button>
  );

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-3 tabular-nums">
        <span className={cn("text-h2 font-semibold", onSale && "text-price-sale")}>{formatVnd(v.price)}</span>
        {onSale && <s className="text-lead text-muted-foreground">{formatVnd(v.was)}</s>}
        {onSale && <span className="rounded-full bg-price-sale px-2 py-0.5 text-caption font-semibold text-on-primary">-{Math.round(((v.was - v.price) / v.was) * 100)}%</span>}
      </p>

      {options.map((o) => (
        <fieldset key={o.title} className="mt-6">
          <legend className="text-small font-semibold">{o.title}: <span className="font-normal">{chosen[o.title]}</span></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {o.values.map((val) => (
              <button key={val} type="button" aria-pressed={chosen[o.title] === val} disabled={!available(o.title, val) && chosen[o.title] !== val} onClick={() => pick(o.title, val)} className={cn("h-11 min-w-12 cursor-pointer rounded-md border px-4 text-small font-medium transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground disabled:line-through", chosen[o.title] === val ? "border-primary bg-primary-tint text-primary" : "border-border bg-card hover:border-foreground", !available(o.title, val) && "text-muted-foreground")}>
                {val}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {v.stock > 0 && v.stock <= 5 && <p className="mt-2 text-small font-medium text-warning">Chỉ còn {v.stock} sản phẩm</p>}

      <div className="mt-6 flex items-center gap-3">
        <div className="inline-flex h-12 items-center rounded-md border border-border bg-card" role="group" aria-label="Số lượng">
          <Button variant="ghost" size="icon" aria-label="Giảm" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><Minus /></Button>
          <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
          <Button variant="ghost" size="icon" aria-label="Tăng" disabled={qty >= Math.min(v.stock, 10)} onClick={() => setQty(qty + 1)}><Plus /></Button>
        </div>
        <div className="hidden flex-1 md:block">{cta}</div>
      </div>
      <Button variant="outline" size="lg" className="mt-3 hidden w-full md:inline-flex" disabled={soldOut || pending} onClick={buyNow}>Mua ngay</Button>

      {/* mobile sticky bar; page adds bottom padding so it never covers the footer */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-card p-3 md:hidden">
        <p className="shrink-0 font-semibold tabular-nums">{formatVnd(v.price)}</p>
        <div className="flex-1">{cta}</div>
      </div>
    </div>
  );
}
