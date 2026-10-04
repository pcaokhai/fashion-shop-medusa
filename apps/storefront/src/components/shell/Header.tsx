import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { data } from "@/lib/data";
import { SITE } from "@/lib/site";
import { MobileMenu } from "./MobileMenu";

export async function Header() {
  const [categories, cart] = await Promise.all([data.listCategories(), data.getCart()]);
  const links = [...categories.map((c) => ({ href: `/c/${c.handle}`, label: c.name })), { href: "/c/all", label: "Tất cả sản phẩm" }];
  const count = cart?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
  const iconBtn = "relative inline-flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-muted";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[var(--layout-max)] items-center gap-2 px-4 md:px-6">
        <MobileMenu links={links} />
        <Link href="/" className="text-h4 font-bold tracking-[var(--tracking-heading)] text-heading">
          {SITE.name}
        </Link>
        <nav aria-label="Chính" className="ml-8 hidden items-center gap-1 lg:flex">
          {links.slice(0, -1).map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-small font-medium hover:bg-muted">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/search" aria-label="Tìm kiếm" className="hidden h-11 w-64 cursor-pointer items-center gap-2 rounded-full bg-muted px-4 text-small text-muted-foreground md:flex">
            <Search className="size-4" /> Tìm sản phẩm…
          </Link>
          <Link href="/search" aria-label="Tìm kiếm" className={`${iconBtn} md:hidden`}>
            <Search />
          </Link>
          <Link href="/cart" aria-label={`Giỏ hàng, ${count} sản phẩm`} className={iconBtn}>
            <ShoppingBag />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-cta text-caption font-semibold text-on-primary">{count}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
