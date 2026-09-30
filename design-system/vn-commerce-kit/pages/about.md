# About & Store Locator Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Brand content. Rules here override `MASTER.md`.
> Prototype boards: `About.dc.html`, `MobileAbout.dc.html`. Footer links "Câu chuyện thương hiệu" and
> "Hệ thống cửa hàng" point here. All brand facts, years, numbers and addresses are `[placeholders]` until the owner
> supplies them (ratings marked * must link to their source).

## Layout
- Hero (tinted, parallax decorative blocks, H1 + intro + CTAs), dark stats band, **timeline** (desktop: alternating
  cards around a centre line that is drawn by scroll; mobile: single column with a left line), values (3 cards;
  mobile horizontal snap), **store locator**, closing CTA band (online purchase, in-store size exchange).
- Store locator: city chips; store list cards with live open/closing-soon/closed status computed from the store's hours
  in Asia/Ho_Chi_Minh and a "Nhận tại cửa hàng" badge; map with pins (selected pin bounces + ripple); selected store
  detail with hours, "Chỉ đường" (maps deep link) and "Gọi cửa hàng". Prototype map is illustrative; production uses a
  lazy-loaded maps embed (no layout shift: fixed-height container).

## Motion
MI-25 (sr-left/right alternating on timeline), MI-29 hero parallax, timeline draw (scroll-linked `scaleY`), MI-33 pin
bounce, value icon tilt on hover. All disabled with reduced motion.
