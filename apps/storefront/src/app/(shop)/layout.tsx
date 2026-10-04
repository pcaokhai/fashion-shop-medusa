import type { ReactNode } from "react";
import { Footer } from "@/components/shell/Footer";
import { Header } from "@/components/shell/Header";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1 pb-10 md:pb-22">{children}</main>
      <Footer />
    </>
  );
}
