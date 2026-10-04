import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Crawlable ?page= links; keeps the other query params. */
export function Pagination({ page, pages, from, to, total, basePath, query }: { page: number; pages: number; from: number; to: number; total: number; basePath: string; query: Record<string, string> }) {
  if (pages <= 1) return null;
  const href = (n: number) => `${basePath}?${new URLSearchParams({ ...query, ...(n > 1 ? { page: String(n) } : {}) })}`;
  const cell = "inline-flex size-11 items-center justify-center rounded-md text-small font-medium";
  return (
    <nav aria-label="Phân trang" className="mt-10 flex flex-col items-center gap-3">
      <ul className="flex items-center gap-1">
        {page > 1 && <li><Link href={href(page - 1)} aria-label="Trang trước" className={`${cell} hover:bg-muted`}><ChevronLeft className="size-5" /></Link></li>}
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <li key={n}><Link href={href(n)} aria-current={n === page ? "page" : undefined} className={`${cell} ${n === page ? "bg-primary text-on-primary" : "hover:bg-muted"}`}>{n}</Link></li>
        ))}
        {page < pages && <li><Link href={href(page + 1)} aria-label="Trang sau" className={`${cell} hover:bg-muted`}><ChevronRight className="size-5" /></Link></li>}
      </ul>
      <p className="text-caption text-muted-foreground">Hiển thị {from}–{to} trên {total}</p>
    </nav>
  );
}
