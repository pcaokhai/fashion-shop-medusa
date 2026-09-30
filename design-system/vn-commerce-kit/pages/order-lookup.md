# Guest Order Lookup Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Utility (no sign-in). Rules here override `MASTER.md`.
> Prototype boards: `Track.dc.html`, `MobileTrack.dc.html`. Related: VCK-405 (tracking timeline), VCK-406/407 (lookup + self-cancel), VCK-602 (Zalo ZNS).
> Footer link "Tra cứu đơn hàng" points here on every storefront page.

## Behaviour
- Lookup requires **order code + phone used at checkout**; code accepted with or without `VCK-`, spaces ignored.
- Generic failure message (never reveal whether the code or the phone was wrong); **5 failed attempts → 30s lock**
  with countdown (production: per-IP + per-code rate limit, then captcha).
- Result shows **masked PII**: name `First *** Last`, phone `0901 *** 123`, address `[***], ward, province`. Items, totals,
  payment state and the carrier timeline are shown in full.
- Actions: copy tracking code; opt in to Zalo ZNS updates for this order; **cancel only while "Chờ xác nhận"**, verified by
  a 6-digit OTP sent via ZNS (SMS fallback), 5-minute validity, resend after 60s; delivered orders link to
  return policy and to sign-in for reviews; "Tạo tài khoản để lưu đơn này" (claim order after sign-up).
- Empty state: 3 help cards (where to find the code, missing messages, changing the address).

## Layout
- Desktop: tinted hero with headline + trust chips (left) and the lookup card (right); result below: header row
  (code, status badge, placed at, "Tra cứu đơn khác"), route map card (MI-23), then items/totals + masked address (left)
  and status log + action card (right). Global footer.
- Mobile: hero + lookup card, demo chips in a snap row; result stacked with collapsible status log; OTP in a bottom sheet.

## Contract and module (resolved 2026-09-30)
Backed by `medusa-guest-order-access-vck` (docs/14, ADR-014) and the `store-order-lookup` endpoints (docs/04 §4).
Stories: VCK-406 (module, option A), VCK-407 (this page), VCK-408 (option B, backlog).
- Token from `createOrderLookup` is kept in memory/sessionStorage and sent as `X-Order-Lookup-Token`; never in URLs.
- The cancel button renders only when `actions.can_cancel`. Block reasons map to copy:
  `not_pending` → "Đơn đã được xác nhận, vui lòng liên hệ shop để huỷ"; `payment_mode_not_allowed` → "Đơn đã thanh
  toán online — shop sẽ hỗ trợ huỷ và hoàn tiền" + Zalo/hotline; `already_cancelled` → hide actions.
- OTP errors: 422 shows attempts left; 410 offers "Gửi mã mới"; 429 shows the countdown; 409 during verify refreshes
  the order and explains that the shop has just confirmed it.
- Demo codes in the prototype: `VCK-264098` (COD, cancellable), `VCK-264097` (VNPay paid, blocked by option A).
