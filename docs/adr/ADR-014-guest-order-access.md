# ADR-014 Guest order access: lookup token, rate limits, OTP-verified self-cancel as a reusable module
Status: Accepted · Date: 2026-09-30 · Deciders: Khai · Related: VCK-406, VCK-407, VCK-408, docs/14, R-12, R-13

## Context
Many COD buyers never create an account, but the footer promises "Tra cứu đơn hàng". `getOrderTracking` takes an
internal order id with no ownership check, display ids are sequential (enumerable), and PDPL (Decree 13/2023) requires
data minimisation. Self-cancel must not race with staff confirmation, and cancelling a paid order involves refunds.

## Options considered
1. Reuse `getOrderTracking` with the display id — trivial; enumerable, leaks PII. Rejected.
2. Magic link by SMS/email only — strong ownership; friction and message cost on every lookup.
3. Display id + phone → short-lived opaque token; OTP only for the destructive action — low friction, bounded cost.
4. Force account creation — lowest risk; hurts COD conversion. Rejected.

## Decision
Option 3, packaged as `medusa-guest-order-access-vck` (docs/14):
- Lookup requires display id + phone (normalised `+84`/`0`); failures return one generic 404 with constant response time.
- Limits: 10 attempts / 10 min / IP, 5 failures / display id → 15 min lock, captcha after 3 failures / IP.
- Success returns a 256-bit opaque token (Redis, 15 min, one order) sent via `X-Order-Lookup-Token` — never in URLs.
- Masking is server-side. Every lookup/OTP/cancel writes an append-only `guest_access_event` (hashed IP/display id).
- Cancel = policy check → OTP (6 digits, 5 min, stored as HMAC, 5 tries, resend 60 s, 5 sends/h) via ZNS → SMS fallback
  → verify → cancel workflow with row lock + re-check (staff confirm wins; 409).
- **v1 policy (option A):** only `pending` orders paid by **COD**. Paid orders show a support path.
- **Option B later without code changes to the core:** enable `online` payment modes in options and register a
  `RefundAdapter` (VNPay via VCK-205 workflow; VietQR via a recon row for manual refund) — VCK-408.

## Consequences
+ Portable to other client shops by options; extension points are interfaces, not forks.
+ Cost of abuse bounded (OTP only for cancel; per-order and per-hour send caps).
− Redis becomes required for this module (already present for events/cache).
− Sequential display ids stay; if enumeration attempts show up in `guest_access_event`, switch to a random suffix
  (display format change is a new ADR). Wrong if: support tickets about "can't find my order" exceed 2% of COD orders.
