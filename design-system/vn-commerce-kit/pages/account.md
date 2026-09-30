# Account & Order Tracking Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Signed-in utility. Rules here override `MASTER.md`.
> Prototype boards: `Account.dc.html`, `MobileAccount.dc.html`. Stories VCK-301..303, VCK-405, VCK-603, VCK-606.

## Auth (signed-out)
- Desktop: single **centred card** (480px) over a tinted decorative background; segmented Đăng nhập / Đăng ký;
  forgot / sent / reset / verify states in the same card; 3 benefit chips below the card.
- Mobile: logo mark + headline, same segmented control and states, demo-fill button.
- Lockout banner after 5 failed attempts with countdown; errors are `role="alert"`.

## Layout — desktop (signed-in)
- **Profile band** (primary-dark): avatar initial, greeting, verified email, 3 stat buttons (orders in progress,
  saved addresses, wishlist) that navigate.
- **Horizontal tabs** sticky under the header (Tổng quan, Đơn hàng, Địa chỉ, Yêu thích, Cài đặt) with counts; logout
  on the right. Replaces the side navigation.
- Overview: active-order card with 5-step progress + default address card + recent orders **table**.
- Orders: status filter pills + **table** (code, thumbnails, date, payment, status badge, total, Mua lại / Chi tiết).
- Order detail: header actions (Mua lại, Viết đánh giá, Huỷ đơn when allowed); **parcel route map** (MI-23): Kho →
  Bưu cục lấy → Trung tâm phân loại → Bưu cục giao → Bạn with a truck marker at the current node, GHN code + copy;
  then items/totals + delivery address (left) and the status log timeline (right).
- Addresses as full-width row cards (label/recipient | address + legacy-ward fix | actions). Wishlist 4-col grid.
  Settings 2-col (profile | notifications + password) with the danger zone full width below.

## Layout — mobile (signed-in)
- One scroller: sticky header + **scrollable pill tabs** (Tổng quan, Đơn hàng, Yêu thích, Tôi) — no bottom tab bar.
- Home: green profile card with stats, active-order card with progress bar, recent orders list.
- Order detail: mini route map, collapsible status log (`<details>`), items, address; sticky action bar
  (Mua lại / Viết đánh giá / Huỷ) with content padding so it never covers the last card.
- Forms and confirmations are bottom sheets (address, delete address, cancel order, review, delete account).
- Global footer at the end of every signed-in screen.

## Motion
Subtle only: tab indicator slide, content enter ≤ 300ms, MI-16 status log, MI-23 truck move 600ms (reduced: jump).
