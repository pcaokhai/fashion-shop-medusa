# Product Detail Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** PDP. Rules here override `MASTER.md`.

## Layout
- Desktop: gallery 7/12 (thumbnails vertical) + sticky buy box 5/12; mobile: swipe gallery with dots, sticky bottom bar (price + "Thêm vào giỏ").
- Buy box order: title → rating link → price (sale + original + "-x%") → variant swatches (colour) + size chips + size guide link → quantity → CTA pair ("Thêm vào giỏ" cta, "Mua ngay" outline) → USP mini list → shipping estimate (ward-based when address known).
- Below: description tabs (Mô tả, Thông số, Đổi trả), reviews (VCK-603/606), related products rail.

## Motion
- MI-08 gallery, MI-09 variant change crossfade, MI-10 add-to-cart flight + drawer, MI-11 wishlist.
- Price changes on variant switch update instantly (no count-up animation on money).

## Footer
- Global footer after the related rail on both breakpoints. Mobile: footer sits inside the scroller and ends with a
  spacer equal to the sticky buy bar height so the bar never covers footer content.
