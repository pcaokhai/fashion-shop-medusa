import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

// MASTER §5: no global header/footer on checkout steps; a bare brand bar keeps a way home.
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[var(--layout-max)] items-center px-4 md:px-6">
          <Link href="/" className="text-h4 font-bold tracking-[var(--tracking-heading)] text-heading">{SITE.name}</Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
