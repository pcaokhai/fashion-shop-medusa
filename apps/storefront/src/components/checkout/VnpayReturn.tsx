"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pollVnpay } from "@/lib/data/checkout-actions";
import type { PaymentReturnStatus } from "@/lib/data/checkout";

const POLL_MS = 2000;
const LONG_WAIT_MS = 15_000;

/** Display only: asks the backend what it knows and never marks anything paid itself. */
export function VnpayReturn({ query }: { query: Record<string, string> }) {
  const router = useRouter();
  const [status, setStatus] = useState<PaymentReturnStatus | null>(null);
  const [long, setLong] = useState(false);
  const code = query.vnp_ResponseCode;

  useEffect(() => {
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      const s = await pollVnpay(query);
      if (stop) return;
      if (s) setStatus(s);
      if (Date.now() - started > LONG_WAIT_MS) setLong(true);
      if (s?.display_status === "PAID") return router.replace(`/order/${s.order_id ?? query.vnp_TxnRef ?? ""}`);
      if (s && s.display_status !== "PENDING_CONFIRMATION") return;
      setTimeout(() => void tick(), POLL_MS);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [query, router]);

  const failed = status && (status.display_status === "FAILED" || status.display_status === "CANCELLED_BY_USER");

  if (failed) {
    const cancelled = status.display_status === "CANCELLED_BY_USER";
    return (
      <div role="alert" className="mx-auto max-w-lg space-y-5 text-center">
        <XCircle className="mx-auto size-14 text-destructive" aria-hidden />
        <h1 className="text-h3 font-bold text-heading">{cancelled ? "Bạn đã hủy thanh toán" : "Thanh toán chưa thành công"}</h1>
        <p className="text-muted-foreground">Chưa có khoản tiền nào bị trừ. Giỏ hàng và địa chỉ của bạn vẫn được giữ nguyên.</p>
        {code && <p className="text-caption text-muted-foreground">Mã phản hồi VNPay: <span className="font-mono">{code}</span> (đọc mã này khi cần hỗ trợ)</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="cta" size="lg"><Link href="/checkout">Thử lại với VNPay</Link></Button>
          <Button asChild variant="outline" size="lg"><Link href="/checkout?pay=cod">Đổi sang COD</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-lg space-y-5 text-center">
      <Loader2 className="mx-auto size-14 animate-spin text-primary" aria-hidden />
      <h1 className="text-h3 font-bold text-heading">Đang xác nhận thanh toán…</h1>
      <p className="text-muted-foreground">Vui lòng không thanh toán lại. Chúng tôi đang chờ ngân hàng xác nhận, thường mất vài giây.</p>
      {long && (
        <p className="flex items-start gap-2 rounded-md bg-muted p-4 text-left text-small text-muted-foreground">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          Bạn có thể đóng trang này. Chúng tôi sẽ gửi email khi có kết quả; nếu không tạo được đơn, tiền sẽ được hoàn lại tự động.
        </p>
      )}
    </div>
  );
}
