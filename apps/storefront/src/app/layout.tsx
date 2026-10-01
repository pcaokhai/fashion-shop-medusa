import type { Metadata } from "next";
import type { ReactNode } from "react";
import { beVietnamPro } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "VN Commerce Kit",
  description: "Cửa hàng trực tuyến cho thị trường Việt Nam.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>{children}</body>
    </html>
  );
}
