# Notification Templates (Email & Zalo ZNS)

> **PROJECT:** VN Commerce Kit · **Surface:** transactional messages. Stories VCK-601 (email), VCK-602 (ZNS).
> Prototype board: `Emails.dc.html` (template list · preview at 600/375px · template spec panel).

## Email (VCK-601)
| Code | Trigger | Key content |
| --- | --- | --- |
| ORDER_CONFIRMED | COD placed / online payment captured | items, total, payment, address, ETA, "Xem đơn hàng" |
| PAYMENT_RECEIVED | `vck.payment.reconciled` / IPN | "ĐÃ THANH TOÁN" badge, amount, method, txn ref, time |
| SHIPPED | fulfillment created (GHN) | mini route, tracking code, ETA, COD amount, "Theo dõi đơn hàng" |
| DELIVERED | GHN delivered webhook | review CTA, free size-exchange deadline |
| PASSWORD_RESET | reset requested | masked email, 30-min single-use link, "not you?" note |
| EMAIL_VERIFY | customer created | verify link (24h), ignore note |
| ORDER_CANCELLED | `vck.order.guest_cancelled` / staff cancel | cancel reason, restock note, refund line when applicable (option B), "Đặt lại" CTA |

Layout: 600px max, table-based in production (MJML or React Email), brand bar, H1, intro, optional order box / rows,
single CTA in `--color-cta`, footer with business identity and "transactional — no advertising". Subject and preheader
are part of the template spec. Variables use `{snake_case}`; money pre-formatted VND.

## Zalo ZNS (VCK-602)
Templates: order confirmation, out for delivery, **OTP for guest order cancel** (see pages/order-lookup.md). ZNS
templates must be approved by Zalo before use (template id per environment); send only with customer consent; on
failure fall back to SMS (OTP) or email. Every send is logged in `notification_log` with an idempotency key.
