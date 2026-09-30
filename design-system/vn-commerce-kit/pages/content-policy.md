# Content & Policy Pages Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Long-form content. Rules here override `MASTER.md`.
> Prototype boards: `Policy.dc.html`, `MobilePolicy.dc.html`. Content is CMS-managed (one template, six documents).

## Documents
Đổi trả · Vận chuyển & giao hàng · Hướng dẫn thanh toán · Hướng dẫn chọn size · Chính sách bảo mật · Điều khoản sử dụng.
These pages (plus business identity in the footer) are prerequisites for MOIT website notification — treat them as
go-live blockers, with legal text reviewed by the owner/lawyer. Demo copy uses `[placeholders]` for every business fact.

## Layout
- Desktop: left sticky rail (document nav with icons + support card: hotline, Zalo OA, order lookup) and an article column
  ≤ 780px: breadcrumb, H1, "Cập nhật lần cuối", **Tóm tắt nhanh** box (3 bullets), numbered sections (paragraphs,
  bullet lists, responsive tables in an overflow container), FAQ accordions, "Trang này có giúp ích?" feedback.
- Legal documents show a dashed notice that the text is a template pending review (demo only; removed in production).
- Size guide adds a product-type tab (Áo / Quần / Giày) switching the measurement table.
- Mobile: sticky horizontal chips for the six documents under the header, same article structure, support card at the end.

## Style & motion
Body 15px / 1.7–1.75 line height, headings in `--color-heading`; tables never force page-level horizontal scroll.
Motion: article enter ≤ 300ms on document switch; FAQ "+" rotates 45°.
