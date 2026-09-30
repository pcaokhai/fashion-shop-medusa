# Cart & Checkout Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Transactional. Rules here override `MASTER.md`.
> Prototype boards: `Checkout.dc.html` (desktop), `MobileCheckout.dc.html`. Stories VCK-201, VCK-206, VCK-405, VCK-607.

## Principles
Calm, fast, trustworthy: no promotional bands, no autoplay, minimal motion (functional only), header reduced to logo +
secure badge + help link. **No global footer** on checkout steps (exit links reduce conversion); a one-line legal
strip (business name, policies) is allowed on the success page.

## Layout
- Desktop two columns: steps (contact → address → shipping → payment) 7/12 + sticky order summary 5/12.
- Mobile single column; summary collapsible at top showing total; sticky bottom "Đặt hàng" button with total.
- Payment options as large radio cards with logos: COD, VNPay, VietQR; each shows a one-line explanation.
- Errors inline near fields + summary at top of the step with links (`role="alert"`).

## Desktop step sections
- Left column = three numbered cards (1 Thông tin nhận hàng, 2 Vận chuyển, 3 Thanh toán). The active card is expanded;
  completed cards collapse to a one-line summary with "Sửa"; future cards are dimmed with a grey number.
- Each card ends with its own CTA aligned right (min 300px); the pay CTA repeats the total ("Đặt hàng · 461.000 ₫").
- Right column = sticky summary card: items with quantity badge, promo field + feedback (`role="status"`), totals with
  live total, trust notes (đổi size, no card storage, COD inspection).

## Payment result states (VCK-206, VCK-607)
- **VNPay gateway**: real redirect in production; the prototype shows a clearly labelled sandbox mock with outcome buttons.
- **Pending (return URL before IPN)**: never mark paid from the return URL (ADR-007). Show "Đang xác nhận thanh toán…",
  tell the shopper not to pay again, poll order status; after ~15s show "you can close this page — email on result,
  automatic refund if no order".
- **Failed / cancelled** (`vnp_ResponseCode` shown for support, e.g. 51, 24): state that no money was taken, keep cart and
  address, offer "Thử lại với VNPay" (primary), "Chuyển khoản VietQR", "Đổi sang COD".
- **VietQR waiting**: QR + countdown ring, bank/account/amount/memo rows with copy buttons (memo highlighted as mandatory),
  live status card ("Đang chờ tiền về…" → "Đã nhận được tiền — đang tạo đơn…"), instructions, switch method / COD.
  **Expired**: overlay on the QR "Mã đã hết hạn — đừng chuyển theo mã cũ" + "Tạo mã mới" (new memo).
- **Success**: check draw + one-shot confetti, order number (focused), payment / shipping / address tiles, "Theo dõi đơn
  hàng" + "Tiếp tục mua sắm", one-line legal strip.

## Motion
- MI-12 cart line changes, MI-13 stepper, MI-14 payment waiting states, MI-15 success. Durations ≤ 220ms except success moment.
