import type { MetadataRoute } from "next";

// Any public non-production deploy is noindex (apps/storefront/CLAUDE.md); production sets NEXT_PUBLIC_INDEXABLE=1.
export default function robots(): MetadataRoute.Robots {
  return process.env.NEXT_PUBLIC_INDEXABLE === "1" ? { rules: { userAgent: "*", allow: "/" } } : { rules: { userAgent: "*", disallow: "/" } };
}
