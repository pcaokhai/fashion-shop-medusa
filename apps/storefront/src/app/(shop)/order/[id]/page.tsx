import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Banknote, CreditCard, MapPin, Truck } from "lucide-react";
import { SuccessMark } from "@/components/checkout/SuccessMark";
import { Button } from "@/components/ui/button";
import type { OrderSnapshot } from "@/lib/data/checkout";
import { SNAPSHOT_COOKIE } from "@/lib/data/checkout/constants";
import { formatVnd } from "@/lib/money";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Đặt hàng thành công" };

async function readSnapshot(id: string): Promise<OrderSnapshot | null> {
  try {
    const s = JSON.parse((await cookies()).get(SNAPSHOT_COOKIE)?.value ?? "null") as OrderSnapshot | null;
    return s && (s.id === id || s.id === null || s.ref === id) ? s : null;
  } catch {
    return null;
  }
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await readSnapshot(decodeURIComponent(id));
  if (!o) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-20 text-center">
        <h1 className="text-h3 font-bold text-heading">Không tìm thấy đơn hàng</h1>
        <p className="text-muted-foreground">Thông tin đơn chỉ hiển thị trên thiết bị vừa đặt hàng. Kiểm tra email xác nhận của bạn.</p>
        <Button asChild variant="cta"><Link href="/c/all">Tiếp tục mua sắm</Link></Button>
      </div>
    );
  }
  const Pay = o.payment === "cod" ? Banknote : CreditCard;
  const tile = "space-y-2 rounded-lg border border-border bg-card p-4 text-small";
  const tileTitle = "flex items-center gap-2 font-semibold text-heading";
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      <div className="space-y-3 text-center">
        <SuccessMark />
        <h1 className="text-h2 font-bold text-heading">Cảm ơn bạn đã đặt hàng!</h1>
        <p className="text-muted-foreground">
          Mã đơn <span id="order-ref" tabIndex={-1} className="font-mono font-semibold text-foreground outline-none">{o.ref}</span>. Xác nhận đã gửi tới {o.email}.
        </p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className={tile}>
          <p className={tileTitle}><Pay className="size-4 text-primary" aria-hidden />Thanh toán</p>
          <p className="text-muted-foreground">{o.payment === "cod" ? "Trả tiền mặt khi nhận hàng" : "VNPay · đã thanh toán"}</p>
        </div>
        <div className={tile}>
          <p className={tileTitle}><Truck className="size-4 text-primary" aria-hidden />Vận chuyển</p>
          <p className="text-muted-foreground">{o.shippingName}</p>
        </div>
        <div className={tile}>
          <p className={tileTitle}><MapPin className="size-4 text-primary" aria-hidden />Giao tới</p>
          <p className="text-muted-foreground">{o.name} · {o.phone}<br />{o.addressLine}</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-card p-4 md:p-6">
        <ul className="divide-y divide-border">
          {o.items.map((i, n) => (
            <li key={n} className="flex items-baseline justify-between gap-4 py-2 text-small">
              <span>{i.title}{i.variant && <span className="text-muted-foreground"> · {i.variant}</span>} <span className="text-muted-foreground">× {i.quantity}</span></span>
              <span className="tabular-nums">{formatVnd(i.unit * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-border pt-3 text-small">
          <div className="flex justify-between"><dt className="text-muted-foreground">Tạm tính</dt><dd className="tabular-nums">{formatVnd(o.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Vận chuyển</dt><dd className="tabular-nums">{formatVnd(o.shipping)}</dd></div>
          <div className="flex items-baseline justify-between pt-1"><dt className="font-semibold">Tổng cộng</dt><dd className="text-h4 font-bold tabular-nums">{formatVnd(o.total)}</dd></div>
        </dl>
      </div>
      <div className="mt-8 flex justify-center">
        <Button asChild variant="cta" size="lg"><Link href="/c/all">Tiếp tục mua sắm</Link></Button>
      </div>
      <p className="mt-10 text-center text-caption text-muted-foreground">{SITE.name} · MST {SITE.taxId} · {SITE.address}</p>
    </div>
  );
}
