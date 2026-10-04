import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/money";

// Mock mode only: stands in for the VNPay sandbox so the journey can be clicked through without the backend.
export default async function MockGateway({ searchParams }: { searchParams: Promise<{ ref?: string; amount?: string }> }) {
  if (process.env.NEXT_PUBLIC_API_MODE === "real") notFound();
  const { ref = "", amount = "0" } = await searchParams;
  const amt = Number.parseInt(amount, 10) || 0;
  const back = (code: string) => `/checkout/vnpay-return?vnp_ResponseCode=${code}&vnp_TxnRef=${encodeURIComponent(ref)}&vnp_Amount=${amt * 100}`;
  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-16 text-center">
      <p className="inline-block rounded-full bg-warning/15 px-3 py-1 text-caption font-semibold text-warning">Sandbox giả lập · không phải VNPay thật</p>
      <h1 className="text-h3 font-bold text-heading">Cổng thanh toán VNPay</h1>
      <p className="text-muted-foreground">Đơn <span className="font-mono">{ref}</span> · <span className="font-semibold tabular-nums text-foreground">{formatVnd(amt)}</span></p>
      <div className="flex flex-col gap-3">
        <Button asChild variant="cta" size="lg"><Link href={back("00")}>Thanh toán thành công</Link></Button>
        <Button asChild variant="outline" size="lg"><Link href={back("51")}>Thất bại (51 · không đủ số dư)</Link></Button>
        <Button asChild variant="ghost" size="lg"><Link href={back("24")}>Hủy giao dịch</Link></Button>
      </div>
    </div>
  );
}
