# API Contract — conventions and catalogue
Version 1.0 · 2026-09-29 · Owner: Tech lead · Normative source: `contracts/openapi.yaml`, `contracts/events/`

## 1. Topology
Storefront → Medusa server `:9000`: core Store API (`/store/*`, via `@medusajs/js-sdk`) + custom store routes below.
Admin SPA `/app` → core Admin API + custom `/admin/*`. Providers → `/hooks/*`. Feeds `/feeds/*` are public, cached.
Only custom routes are specified here (ADR-005); core API changes arrive with Medusa upgrades and are reviewed in the upgrade PR.

## 2. Conventions
| Topic | Rule |
| --- | --- |
| Versioning | Custom routes follow Medusa's unversioned paths; breaking change ⇒ new path + deprecation note, oasdiff gate in CI |
| Media type | `application/json`; errors `application/problem+json` |
| Naming | snake_case fields (Medusa style); enums SCREAMING_SNAKE_CASE; provider payloads keep provider casing |
| IDs | Opaque strings (Medusa prefixed ULIDs); never parse |
| Money | Integer VND (`Money` schema); no decimals, no floats |
| Time | RFC 3339 with offset; business dates `yyyy-MM-dd` in Asia/Ho_Chi_Minh |
| Idempotency | `Idempotency-Key` (UUID) required on custom POST that creates/changes state; 24 h replay window |
| Concurrency | `If-Match: <version>` on admin resolution endpoints → 412 on mismatch |
| Pagination | Cursor (`cursor`, `limit` ≤ 100, `next_cursor`) on custom lists |
| Auth | Store: publishable key header + customer bearer where marked; Admin: admin bearer/session |
| Tracing | Accept/emit `traceparent`; problem responses include `trace_id` |
| Sensitive data | No PII in URLs; reviews expose masked author names only |
| Fields | Custom store routes return fixed shapes; no `fields` expansion beyond allow-list (v2.21 behaviour) |

## 3. Error model
```json
{"type":"https://vck.dev/problems/out-of-stock","title":"Out of stock","status":409,
 "detail":"Variant variant_01... has 0 available","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736"}
```
| Problem type | Status | When |
| --- | --- | --- |
| validation-failed | 400 | Zod validation; `errors[]` lists fields |
| unauthenticated | 401 | Missing/invalid token or webhook auth |
| forbidden | 403 | Review without verified purchase; admin lacks permission |
| not-found | 404 | Resource missing or slice flag off |
| conflict / out-of-stock / already-reviewed | 409 | State conflicts |
| precondition-failed | 412 | `If-Match` version mismatch |
| unprocessable-cart | 422 | Cart missing address/items for quote |
| rate-limited | 429 | Limits in docs/02 §7.1; guest lookup may add `captcha_required: true` |
| cancellation-not-allowed | 409 | Guest cancel blocked by policy/state; extension `reason` (ADR-014) |
| otp-invalid | 422 | Wrong OTP; extension `attempts_left` |
| otp-expired | 410 | OTP challenge expired |
| upstream-unavailable | 503 | Required dependency down (search/DB) |
Not errors: carrier quote failures (per-quote status), VNPay IPN outcomes (RspCode JSON), payment declines (display status).

## 4. Endpoint catalogue
| Method | Path | Story | Purpose |
| --- | --- | --- | --- |
| GET | `/store/search` | VCK-106 | Accent-insensitive search + facets |
| GET | `/store/vn-address/provinces` | VCK-401 | Province list |
| GET | `/store/vn-address/provinces/{province_code}/wards` | VCK-401 | Wards of province |
| POST | `/store/vn-address/resolve-legacy` | VCK-401 | Legacy 3-tier → 2-tier |
| POST | `/store/shipping/quote` | VCK-402 | Live quotes |
| POST | `/store/payments/vnpay/verify-return` | VCK-203 | Display-only return verification |
| GET | `/store/payments/vietqr/{cart_id}` | VCK-604 | Transfer instruction |
| GET | `/store/orders/{order_id}/tracking` | VCK-403 | Shipment timeline (signed-in owner only) |
| POST | `/store/order-lookup` | VCK-406 | Guest lookup → token + masked order |
| GET | `/store/order-lookup/session` | VCK-406 | Refresh masked order (token header) |
| PUT | `/store/order-lookup/session/notifications` | VCK-406 | ZNS opt-in/out |
| POST | `/store/order-lookup/session/cancel-otp` | VCK-406 | Send cancel OTP |
| POST | `/store/order-lookup/session/cancel` | VCK-406 | Verify OTP + cancel |
| GET, POST | `/store/customers/me/wishlist` | VCK-303 | Wishlist read/add |
| DELETE | `/store/customers/me/wishlist/{variant_id}` | VCK-303 | Wishlist remove |
| GET, POST | `/store/products/{product_id}/reviews` | VCK-603 | Reviews list/create |
| POST | `/store/customers/me/deletion-request` | VCK-304 | Account deletion |
| GET | `/hooks/vnpay/ipn` | VCK-203 | VNPay IPN |
| POST | `/hooks/ghn` | VCK-403 | GHN status webhook |
| POST | `/hooks/vietqr` | VCK-604 | Bank transaction webhook |
| GET | `/admin/reports/kpi` | VCK-501 | KPI report |
| GET | `/admin/payments/reconciliations` | VCK-505 | Recon list |
| POST | `/admin/payments/reconciliations/{reconciliation_id}/resolve` | VCK-505 | Resolve mismatch |
| POST | `/admin/fulfillment/packing-slips` | VCK-503 | Batch slips PDF |
| POST | `/admin/imports/products` | VCK-502 | Start CSV import |
| GET | `/admin/imports/{job_id}` | VCK-502 | Import status |
| GET | `/admin/audit-logs` | VCK-504 | Audit trail |
| GET | `/feeds/google-merchant.xml` | VCK-702 | Google feed |
| GET | `/feeds/meta-catalog.csv` | VCK-702 | Meta/TikTok feed |
| GET | `/health/ready` | VCK-007 | Readiness |

## 5. Events (Medusa event bus)
Envelope: `name, id, occurred_at, version, trace_id, data` (JSON Schema in `contracts/events/`).
| Event | Emitted by | Consumers |
| --- | --- | --- |
| `vck.payment.ipn_received` | IPN route | metrics, audit |
| `vck.payment.reconciled` | IPN/recon workflows | notification (PAYMENT_RECEIVED) |
| `vck.payment.mismatch_detected` | IPN/recon/VietQR | admin alert, metrics |
| `vck.shipment.status_changed` | GHN webhook workflow | notification (SHIPPED/DELIVERED), tracking cache |
| `vck.review.submitted` | review create | moderation queue |
| `vck.notification.requested` | order/payment/shipment subscribers | email + ZNS providers |
| `vck.customer.deletion_scheduled` | deletion request | anonymiser job |
| `vck.order.guest_cancelled` | guest cancel workflow | notification (ORDER_CANCELLED), metrics, recon (option B refunds) |
Core Medusa events used: `order.placed`, `product.updated`, `inventory-level.updated` (revalidation), `customer.created`.

## 6. Parallel development workflow
1. Contract PR (`contracts/` only) on sprint day 1 → CI: Spectral, oasdiff, JSON Schema compile, vectors.
2. `make contracts` regenerates storefront types + MSW handlers and backend Zod validators/response types.
3. WEB builds on MSW (fixtures); BE/PKG implement routes with contract tests validating real responses.
4. Integration checkpoint: flag on, mocks off, slice E2E green.
