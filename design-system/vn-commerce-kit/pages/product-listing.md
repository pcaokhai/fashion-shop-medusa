# Product Listing (Category) Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Product grid. Rules here override `MASTER.md`.
> Prototype boards: `Category.dc.html` (desktop), `MobileCategory.dc.html` (mobile) — see docs/13 §3.1.
> Search results have their own override: `pages/search.md`.

## Layout — desktop
- **Category hero band**: tinted background per category (token `--color-cat-*`), breadcrumb, H1, one-line description,
  total count; below it a row of 6 **subcategory tiles** (label, count, line icon; selected = 2px foreground border).
- **Horizontal filter bar** (no left rail), sticky under the header: pill buttons *Kích thước*, *Màu sắc*, *Khoảng giá*
  open **popovers** (MI-21); toggles *Đang giảm giá*, *Còn hàng*; "Xoá lọc (n)" link; result count (`aria-live`);
  density toggle 3/4 columns; sort popover on the right. Popovers close on outside click / `Esc`.
- **Grid**: borderless editorial cards (image 4:5 radius 18px, category eyebrow, colour dots, price row, rating).
  Desktop quick-add shows size buttons on hover/focus (MI-06).
- **Promo tile** spans 2 columns on page 1 only, inserted after the first row; links to the flash-sale campaign.
- **Pagination**: numbered pages (SEO, crawlable `?page=`) with prev/next and "Hiển thị x–y trên n". Page size =
  columns × 3; page 1 holds 2 fewer products to make room for the promo tile. No infinite scroll.
- **SEO text block** after the grid (category copy from CMS + 4 trust bullets), then the global footer.

## Layout — mobile
- Header: back, title + live count, search, cart.
- Subcategories as **story circles** (64px, conic ring when selected) in a horizontal snap row.
- Compact promo card; active-filter chips (removable) or current sort label; grid/list view toggle.
- **Floating dock** "Sắp xếp | Lọc (n)" centred above the home indicator (replaces the sticky bar).
- Filters open a **full-screen panel** from the right with accordions (Kích thước, Màu sắc, Khoảng giá, Tình trạng),
  "Đặt lại" in the header and a sticky "Xem n sản phẩm" button showing the live draft count. Sort = bottom sheet.
- List view: horizontal cards with rating, sold count, colour dots and "+ Giỏ".
- "Xem thêm" with progress (shown/total) on mobile; global footer at the end (bottom padding clears the dock).

## Style
- Only the hero band and promo tile are saturated; the grid stays on background. Density 5 (desktop 4 columns default).
- Empty state: clear copy + "Xoá tất cả bộ lọc".

## Motion
- MI-06 card hover (image scale 1.06, quick-add slide), MI-07 grid re-enter on filter change, MI-21 popovers,
  MI-11 wishlist, MI-10 cart badge bump, MI-19 shared image to PDP. No scroll-reveal on grids.
