"use client";
import Link from "next/link";
import { useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeLine, updateLine } from "@/lib/data/cart-actions";
import type { Cart } from "@/lib/data";
import { formatVnd } from "@/lib/money";
import { cn } from "@/lib/utils";

const MAX_QTY = 10;

export function CartEmpty({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary">
        <ShoppingBag className="size-7" aria-hidden />
      </span>
      <div>
        <p className="text-h4 font-semibold text-heading">Giỏ hàng đang trống</p>
        <p className="mt-1 text-small text-muted-foreground">Chọn vài món bạn thích, chúng tôi giữ giúp bạn.</p>
      </div>
      <Button asChild variant="cta" onClick={onNavigate}>
        <Link href="/c/all">Tiếp tục mua sắm</Link>
      </Button>
    </div>
  );
}

export function CartLines({ cart, onNavigate, className }: { cart: Cart | null; onNavigate?: () => void; className?: string | undefined }) {
  const [pending, start] = useTransition();
  const items = cart?.items ?? [];
  if (!cart || !items.length) return <CartEmpty onNavigate={onNavigate} />;

  const stepper = "inline-flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)} aria-busy={pending}>
      <ul className="flex-1 divide-y divide-border overflow-y-auto px-4 md:px-6">
        <AnimatePresence initial={false}>
          {items.map((l) => (
            <motion.li
              key={l.id}
              layout="position"
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22 }}
              className="flex gap-3 py-4"
            >
              <Link href={`/p/${l.product_handle}`} onClick={() => onNavigate?.()} className="shrink-0">
                <img src={l.thumbnail ?? ""} alt={l.product_title ?? l.title} width={96} height={120} className="aspect-[4/5] w-20 rounded-md bg-muted object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-small font-medium">{l.product_title ?? l.title}</p>
                    {l.variant_title && <p className="text-caption text-muted-foreground">{l.variant_title}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label={`Xóa ${l.product_title ?? l.title}`}
                    disabled={pending}
                    onClick={() => start(() => void removeLine(l.id))}
                    className="-mt-2 -mr-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="inline-flex items-center rounded-md border border-border" role="group" aria-label="Số lượng">
                    <button type="button" aria-label="Giảm" disabled={pending} onClick={() => start(() => void (l.quantity > 1 ? updateLine(l.id, l.quantity - 1) : removeLine(l.id)))} className={stepper}>
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span className="w-6 text-center text-small tabular-nums" aria-live="polite">{l.quantity}</span>
                    <button type="button" aria-label="Tăng" disabled={pending || l.quantity >= MAX_QTY} onClick={() => start(() => void updateLine(l.id, l.quantity + 1))} className={stepper}>
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                  <p className="font-semibold tabular-nums">{formatVnd(l.unit_price * l.quantity)}</p>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="space-y-3 border-t border-border bg-card p-4 md:px-6">
        <p className="flex items-baseline justify-between">
          <span className="text-small text-muted-foreground">Tạm tính</span>
          <span className="text-h4 font-bold tabular-nums">{formatVnd(cart.subtotal ?? 0)}</span>
        </p>
        <p className="text-caption text-muted-foreground">Phí vận chuyển tính ở bước thanh toán.</p>
        <Button asChild variant="cta" size="lg" className="w-full" onClick={onNavigate}>
          <Link href="/checkout">Thanh toán</Link>
        </Button>
      </div>
    </div>
  );
}
