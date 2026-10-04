import Link from "next/link";
import { SITE } from "@/lib/site";
import { FooterColumn } from "./FooterColumn";

const COLS = [
  { title: "Hỗ trợ", links: ["Hướng dẫn chọn size", "Chính sách đổi trả 7 ngày", "Giao hàng & thanh toán", "Liên hệ"] },
  { title: "Về chúng tôi", links: ["Câu chuyện thương hiệu", "Tuyển dụng", "Hệ thống cửa hàng"] },
  { title: "Thanh toán", links: ["COD toàn quốc", "VNPay", "Chuyển khoản QR"] },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-surface-dark text-on-surface-dark">
      <div className="mx-auto grid max-w-[var(--layout-max)] gap-8 px-4 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6">
        <div className="space-y-3 text-small">
          <p className="text-h4 font-bold">{SITE.name}</p>
          <p className="max-w-xs opacity-80">{SITE.tagline}</p>
          <address className="space-y-1 not-italic opacity-80">
            <p>{SITE.address}</p>
            <p>MST: {SITE.taxId}</p>
            <p>Hotline: {SITE.hotline}</p>
          </address>
        </div>
        {COLS.map((c) => (
          <FooterColumn key={c.title} title={c.title}>
            <ul className="mt-1 space-y-1 text-small opacity-80">
              {c.links.map((l) => (
                <li key={l}>
                  <Link href="#" className="flex min-h-10 items-center hover:underline md:min-h-8">{l}</Link>
                </li>
              ))}
            </ul>
          </FooterColumn>
        ))}
      </div>
      <div className="border-t border-on-surface-dark/20 px-4 py-4 text-center text-caption opacity-70">© 2026 {SITE.name}. Đã thông báo Bộ Công Thương.</div>
    </footer>
  );
}
