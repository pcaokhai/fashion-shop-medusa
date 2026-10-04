import type { Metadata } from "next";
import type { ReactNode } from "react";
import { beVietnamPro } from "./fonts";
import { MotionProvider } from "@vck/ui-kit";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { Toaster } from "@/components/ui/sonner";
import { DEMO_BANNER, SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE.name} · ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: "Cửa hàng trực tuyến cho thị trường Việt Nam.",
  robots: process.env.NEXT_PUBLIC_INDEXABLE === "1" ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="flex min-h-dvh flex-col">
        <MotionProvider>
          {DEMO_BANNER && <DemoBanner />}
          {children}
          <Toaster position="bottom-center" />
        </MotionProvider>
      </body>
    </html>
  );
}
