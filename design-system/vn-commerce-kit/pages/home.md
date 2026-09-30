# Home Page Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Commerce home (curated; replaces generated landing pattern)
> Rules here override `MASTER.md`. Motion ids (MI-xx) refer to docs/13 §5.

## Pattern: Commerce Home
Section order (each section is a CMS-able block, reorderable):
1. **Campaign hero** — 1–3 slides, 16:9 desktop / 4:5 mobile, headline + CTA; autoplay 6s, pausable, stops on focus/hover/offscreen (MI-03)
2. **USP strip** — Freeship từ X đ · COD toàn quốc · Đổi trả 7 ngày · Thanh toán VNPay/QR (icons + short text)
3. **Category bento** — 5–7 tiles, one large featured tile; staggered reveal once (MI-04)
4. **Flash sale band** — accent surface, countdown (MI-05), horizontal scroll-snap product row with stock bars
5. **Best sellers** — product grid (8), tabs by top categories
6. **New arrivals** — horizontal rail
7. **Social proof** — verified reviews with photos, average rating, order count
8. **Zalo / newsletter CTA** — follow Zalo OA or email, discount incentive
9. **Footer** — global footer component (MASTER §5): business info, support/about links, payment/shipping logos,
   MOIT notification badge slot; sticks to the bottom of the viewport on short pages

## Layout
- Max width 1280px; merchandising bands full-bleed with contained content; section gap `--space-3xl` desktop, `--space-2xl` mobile.
- Above the fold on 375px: header + hero + first USP line; LCP = hero image (priority, not animated).

## Style
- Vibrant blocks allowed here: accent surfaces for flash sale, primary tint bands; max 2 saturated bands per viewport.
