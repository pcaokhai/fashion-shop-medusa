# Guest Order Access Module — `medusa-guest-order-access-vck`
Version 1.0 · 2026-09-30 · Owner: PKG lane · Decision: ADR-014 · Stories: VCK-406 (core, option A), VCK-407 (UI),
VCK-408 (option B, backlog) · Contract: `contracts/openapi.yaml` tag `store-order-lookup`

## 1. Purpose
Let buyers without an account look up an order with **order code + phone**, follow the shipment, opt in to Zalo
updates and — when the shop's policy allows — **cancel with an OTP**. Built as a Medusa v2 plugin so any client shop can
install it and change behaviour through options and adapters, never by forking the code.

## 2. What is fixed vs configurable
| Always enforced (not configurable) | Configurable per shop |
| --- | --- |
| Generic 404 + constant-time response on lookup failure | Which factors (phone; optional email) |
| Opaque token in header, bound to one order, server-side TTL | Token TTL, rate-limit numbers, captcha provider |
| Server-side masking, no raw PII on this surface | Masking strategy per field (built-ins or custom function) |
| OTP stored as HMAC, attempt counter, single use | OTP length/TTL/attempts/resend cooldown/hourly cap, channel order |
| Cancel re-checks policy under row lock (staff action wins) | Which statuses and payment modes are cancellable, reasons list |
| Append-only access log with hashed identifiers | Retention period, IP hashing secret |
| Refund only through a registered `RefundAdapter` | Which adapters are registered (none in option A) |

## 3. Options (validated with Zod at plugin load)
```ts
// medusa-config.ts — option A (this project, v1)
{
  resolve: "medusa-guest-order-access-vck",
  options: {
    lookup: {
      factors: ["phone"],
      tokenTtlSec: 900,
      constantResponseMs: 350,
      rateLimit: { perIp: { max: 10, windowSec: 600 }, perOrder: { maxFailures: 5, lockSec: 900 }, captchaAfterIpFailures: 3 },
      captcha: { provider: "turnstile", secretEnv: "TURNSTILE_SECRET" }      // optional; omit to disable
    },
    masking: { name: "first-last", phone: "keep-4-3", address: "ward-province" }, // or a function via adapters.masker
    notifications: { allowZnsOptIn: true },
    cancellation: {
      enabled: true,
      statuses: ["pending"],                  // order not yet confirmed by staff
      paymentModes: ["cod"],                  // option A
      restock: true,
      reasons: ["changed_mind", "wrong_item_or_size", "found_better_price", "duplicate_order", "delivery_too_slow", "other"]
    },
    otp: { length: 6, ttlSec: 300, maxAttempts: 5, resendCooldownSec: 60, maxSendsPerHour: 5, channels: ["zns", "sms"] },
    audit: { ipHashSecretEnv: "GOA_IP_HASH_SECRET", retentionDays: 180 }
  }
}
```
Option B (VCK-408) changes **options only** plus adapter registration:
```ts
cancellation: { ..., paymentModes: ["cod", "online"], refundAdapters: ["vnpay-refund", "vietqr-manual-refund"] }
```
Load-time rule: if `paymentModes` includes `online`, at least one refund adapter covering each enabled online payment
provider must be registered, otherwise the plugin fails to start with a message naming the missing adapter.

## 4. Extension points (interfaces in `src/lib/ports.ts`)
| Port | Signature (simplified) | Built-in implementations | Used for |
| --- | --- | --- | --- |
| `OtpChannel` | `send({ to, code, locale, orderDisplayId }): Promise<{ delivered: boolean; providerRef?: string }>` | `zns` (via `medusa-notification-zns-vck`), `sms` (HTTP adapter template), `email` | OTP delivery with ordered fallback |
| `RefundAdapter` | `supports(payment): boolean` · `refund({ order, payment, amount, reason, idempotencyKey })` | none in A; `vnpay-refund` (VCK-205 workflow), `vietqr-manual-refund` (creates recon row) in B | Refund step inside the cancel workflow (with compensation) |
| `CancellationPolicy` | `evaluate({ order, payments, now }): { allowed: true } \| { allowed: false; reason }` | `defaultPolicy(options.cancellation)` | Shop-specific rules (e.g. block orders with flash-sale items) |
| `Masker` | `mask(field, value): string` | `first-last`, `keep-4-3`, `ward-province`, `hide` | Custom masking formats |
| `CaptchaVerifier` | `verify(token, ip): Promise<boolean>` | `turnstile`, `none` | Abuse gate after N failures |
| `OrderReader` | `findByDisplayId(displayId)` / `toView(order)` | Medusa Query based | Other order-number formats / extra fields |
Adapters register in `medusa-config.ts` (`options.adapters`) or from another plugin via the module's
`registerAdapter()` loader hook — a client project adds behaviour without editing this package.

## 5. Flows (Medusa workflows, `src/workflows/`)
1. `guestLookupWorkflow` — normalise → rate-limit check → (captcha) → find order → compare phone hash in constant time →
   write `guest_access_event` → pad to `constantResponseMs` → issue token (Redis) → `toView` + mask.
2. `requestCancelOtpWorkflow` — load token → policy evaluate (409 with reason) → cooldown/hourly caps (429) →
   create challenge (HMAC of code, attempts) → send via channels in order until one delivers → event log.
3. `confirmGuestCancelWorkflow` — load token + challenge → verify code (422/410/429) → **lock order row + re-evaluate
   policy** (409 if staff confirmed meanwhile) → Medusa cancel-order workflow (+ restock) → `RefundAdapter.refund`
   step when required (option B; compensation re-opens nothing — it raises a `payment.mismatch` recon row instead) →
   emit `vck.order.guest_cancelled` → audit (`audit_log` actor `guest:<hash>`) → invalidate challenge.
Staff confirm uses the same row lock, so "confirm" and "guest cancel" are serialised; whichever commits first wins.

## 6. Storage
- Redis (TTL): `goa:tok:<token>` → `{ orderId, iat }`; `goa:rl:ip:<hash>`, `goa:rl:ord:<hash>` counters;
  `goa:otp:<challengeId>` → `{ orderId, codeHmac, attempts, sentAt[] }`.
- Postgres: `guest_access_event` (append-only; docs/05) and `order.metadata.goa_zns_opt_in` with consent timestamp.
- Secrets: `GOA_TOKEN_PEPPER`, `GOA_OTP_HMAC_SECRET`, `GOA_IP_HASH_SECRET` per environment.

## 7. Package layout
```
packages/medusa-guest-order-access-vck/
  src/lib/        normalise.ts, mask.ts, policy.ts, otp.ts, ratelimit.ts, ports.ts   ← pure, ≥ 90% unit coverage
  src/modules/guest-access/   service + guest_access_event model + migration
  src/workflows/  guest-lookup.ts, request-cancel-otp.ts, confirm-guest-cancel.ts
  src/api/store/order-lookup/  route handlers (thin), Zod schemas generated from contract
  src/adapters/   otp-zns.ts, otp-sms.ts, otp-email.ts, captcha-turnstile.ts   (refund adapters live with their payment plugins)
  README.md       options table, adapter guide, sequence diagram link (docs/03 §10)
```

## 8. Reuse checklist for another client project
1. Install the package; set options (factors, limits, masking, cancellation policy) and secrets.
2. Register OTP channels available for that client (ZNS template id per environment, SMS brandname if any).
3. Decide A or B; for B, install the payment plugin that ships a `RefundAdapter` for each online provider.
4. Map the client's order-number format with a custom `OrderReader` if it differs from `XXX-nnnnnn`.
5. Run the contract tests (`pnpm --filter medusa-guest-order-access-vck test:contract`) and TS-20/21 in the client repo.
EOF
