import { Be_Vietnam_Pro } from "next/font/google";

// MASTER §3: one family, Vietnamese subset first-class.
export const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700"],
  subsets: ["vietnamese", "latin"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});
