import { ShieldCheck, RefreshCw, PackageOpen } from "lucide-react";
import type { Cart } from "@/lib/data";
import { formatVnd } from "@/lib/money";

const TRUST = [
  { icon: RefreshCw, text: "Đổi size trong 7 ngày" },
  { icon: ShieldCheck, text: "Không lưu thông tin thẻ" },
  { icon: PackageOpen, text: "COD: được kiểm tra hàng khi nhận" },
];

export function OrderSummary({ cart, shipping }: { cart: Cart; shipping: number | null }) {
  const subtotal = cart.subtotal ?? 0;
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {(cart.items ?? []).map((l) => (
          <li key={l.id} className="flex items-center gap-3">
            <span className="relative shrink-0">
              <img src={l.thumbnail ?? ""} alt="" width={64} height={80} className="aspect-[4/5] w-14 rounded-md bg-muted object-cover" />
              <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-heading text-caption font-semibold text-on-primary tabular-nums">{l.quantity}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-small font-medium">{l.product_title ?? l.title}</span>
              {l.variant_title && <span className="block text-caption text-muted-foreground">{l.variant_title}</span>}
            </span>
            <span className="text-small font-medium tabular-nums">{formatVnd(l.unit_price * l.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-border pt-4 text-small">
        <div className="flex justify-between"><dt className="text-muted-foreground">Tạm tính</dt><dd className="tabular-nums">{formatVnd(subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Vận chuyển</dt><dd className="tabular-nums">{shipping === null ? "Chọn ở bước 2" : formatVnd(shipping)}</dd></div>
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <dt className="font-semibold">Tổng cộng</dt>
          <dd className="text-h4 font-bold tabular-nums" aria-live="polite">{formatVnd(subtotal + (shipping ?? 0))}</dd>
        </div>
      </dl>
      <ul className="space-y-2 rounded-md bg-muted p-3 text-caption text-muted-foreground">
        {TRUST.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2"><Icon className="size-4 shrink-0 text-primary" aria-hidden />{text}</li>
        ))}
      </ul>
    </div>
  );
}
