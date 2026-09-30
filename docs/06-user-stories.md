# User Stories
Version 1.0 · 2026-09-29 · Owner: PO (Khai)

Format: 3 C's + INVEST. Each story ≤ 8 points; AC are numbered and referenced as `VCK-<id>-AC<n>` in test names.
Metadata line: `Lane · points · Slice · Depends · Traces`. Frontend stories depend on contracts, not on backend stories.
Design: client Figma when available, else `packages/ui-kit` defaults (docs/01 §7.1).
Roles: **Shopper** (guest or signed-in), **Customer** (signed-in), **Staff** (admin user), **Owner** (shop owner/admin),
**Developer** (Khai or a Claude Code lane), **Operator** (whoever runs production).

## E0 — Platform (Sprint 0)

### VCK-001 Monorepo scaffold
Lane PLAT · 3 pts · Slice — · Depends: — · Traces: NFR-11
As a Developer, I want a pnpm + Turborepo monorepo with the agreed layout, so that lanes can work in parallel without conflicts.
1. `pnpm install && pnpm turbo run build` succeeds on a clean clone with Node 20 LTS.
2. Workspaces exist for `apps/backend`, `apps/storefront`, `packages/*`, `tools/*`, each with `lint`, `typecheck`, `test` scripts.
3. Shared `tsconfig.base.json` enforces the flags in docs/10 §4.2; ESLint boundaries rules fail a plugin importing from `apps/`.
4. `.claude/settings.json` deny-list and `.gitignore` match docs/11 §2; `CODEOWNERS` reflects lanes.

### VCK-002 Local infrastructure
Lane PLAT · 3 pts · Slice — · Depends: VCK-001 · Traces: NFR-11
As a Developer, I want `make up` to start every dependency locally, so that any lane can run the full stack in one command.
1. `make up` starts Postgres 16, Redis 7, Meilisearch, MinIO, Mailpit, and placeholder sims on the ports in docs/02 §8.
2. Health checks gate dependent services; `make up` returns only when all are healthy (≤ 90 s on the dev machine).
3. `make down` stops everything; `make down v=1` also removes volumes.
4. `.env.example` lists every variable with a comment; no real secrets.

### VCK-003 CI pipeline
Lane PLAT · 3 pts · Slice — · Depends: VCK-001 · Traces: NFR-07
As a Developer, I want CI on every PR, so that main stays releasable.
1. PRs run lint, typecheck, unit and integration tests only for affected workspaces (turbo filters).
2. gitleaks, `pnpm audit --prod` (fail on critical) and licence check run on every PR.
3. PR title must match Conventional Commits with a `VCK-<id>` suffix, else the check fails.
4. CI total time ≤ 12 min for a typical PR (measured on the first 10 PRs, recorded in PROGRESS).

### VCK-004 Contracts pipeline
Lane PLAT · 5 pts · Slice — · Depends: VCK-001 · Traces: NFR-11
As a Developer, I want contract linting, breaking-change detection and code generation, so that frontend and backend never drift.
1. `make contracts` runs Spectral on `openapi.yaml`, compiles every JSON Schema, and regenerates `contracts/vnpay/golden-vectors.json` with no diff.
2. oasdiff against `main` fails the PR on breaking changes unless the PR has label `contract-breaking` and an ADR link.
3. Generates storefront types + MSW handlers (from fixtures) into `apps/storefront/src/generated/` and backend Zod validators into `apps/backend/src/generated/`.
4. Generated folders are read-only by convention: CI fails if generated output differs from committed output.

### VCK-005 Medusa backend skeleton
Lane BE · 3 pts · Slice — · Depends: VCK-002 · Traces: NFR-05, NFR-11
As a Developer, I want a Medusa v2 app running as server and worker, so that production topology exists from day one.
1. Medusa is pinned to the latest 2.21.x; `pnpm --filter backend dev` serves `/app` and `/store` on :9000.
2. The same image runs `MEDUSA_WORKER_MODE=server` and `=worker`; compose starts both.
3. Region `reg_vn` (VND, tax-inclusive prices) and one sales channel with a publishable key are created by an idempotent setup script.
4. `src/lib/money.ts` exposes `Vnd` and `formatVnd`/`toVnpAmount` with unit tests including 0 and 999,999,999.

### VCK-006 Storefront skeleton and UI kit
Lane WEB · 5 pts · Slice — · Depends: VCK-004, VCK-009 · Traces: NFR-09, NFR-11
As a Shopper, I want a fast, consistent shell (header, footer, cart icon), so that every page feels like one brand.
1. Next.js App Router app with `(shop)` layout, header (MI-01), menu drawer (MI-02), footer, cart icon badge, toasts (MI-18), Vietnamese copy.
2. `packages/ui-kit` provides Button, Input, Select, Combobox, Chip, Badge, Dialog, Drawer, Toast, Skeleton (MI-20) built only on VCK-009 tokens, per MASTER §5.
3. `NEXT_PUBLIC_API_MODE=mock` serves pages from MSW fixtures; `=real` uses the JS SDK.
4. Lighthouse mobile on the empty home page ≥ 95 performance and ≥ 95 accessibility.

### VCK-007 Observability baseline and health
Lane BE · 3 pts · Slice — · Depends: VCK-005 · Traces: NFR-10
As an Operator, I want traces, metrics, logs and health endpoints, so that I can see and debug production behaviour.
1. OpenTelemetry instrumentation exports traces for HTTP, workflows and outbound fetch; `trace_id` appears in every log line.
2. `/health/ready` returns 200 only when DB, Redis and search are reachable, else 503 problem+json within 2 s.
3. Metrics endpoint exposes `vck_http_requests_total` and `vck_http_request_duration_seconds` with route templates (no ids).
4. Sentry captures unhandled errors with PII scrubbing verified by a test event containing a phone number.

### VCK-008 Documentation lifecycle tooling
Lane PLAT · 2 pts · Slice — · Depends: VCK-001 · Traces: NFR-11
As a Developer, I want templates and checks for ADR, PROGRESS, BUG and RELEASE, so that documentation stays current without effort.
1. `make docs-check` validates that every `docs/bugs/BUG-*.md` has status, severity, root cause (when closed) and a regression test id.
2. `make release VERSION=x.y.z` drafts `docs/releases/RELEASE-x.y.z.md` from Conventional Commits and Changesets since the last tag and prepends CHANGELOG.
3. PROGRESS "Now" block is validated to contain ≤ 15 lines (docs/11 §4).
4. The PR template links the DoD items that touch docs.

### VCK-009 Design system and motion foundation (UI UX Pro Max)
Lane WEB · 3 pts · Slice — · Depends: VCK-001 · Traces: NFR-09, NFR-11
As a Developer, I want the curated design system and motion tokens in code, so that every UI story is consistent, accessible and animated the same way.
1. `ui-ux-pro-max` skill installed project-level at a pinned version (recorded in ADR-013); `search.py` runs in CI smoke; its `data/` is deny-listed for reads.
2. `packages/ui-kit/src/tokens.css` and Tailwind theme implement every token in MASTER §1–3; a lint rule fails raw hex/px colour values in `apps/storefront`.
3. Be Vietnam Pro loaded via `next/font` with `vietnamese` subset; a visual test renders "Ưu đãi đặc biệt – Giảm 30% – Đồng hồ" without fallback glyphs.
4. `motion.ts` exports the tokens in docs/13 §4.2; `MotionProvider`, `Reveal`, `Stagger` primitives honour reduced motion (unit tests for both modes).
5. A dev-only `/_design` route shows tokens, type scale, components and motion samples for review.

## E1 — Catalogue and search (Sprints 1–2)

### VCK-101 Catalogue configuration
Lane BE · 3 pts · Slice S1 · Depends: VCK-005 · Traces: FR-01, FR-11
As an Owner, I want categories, product options and attributes configured for fashion/general retail, so that 900+ products can be organised and filtered.
1. Category tree supports ≥ 3 levels with handles; options (size, colour, material) are defined per product.
2. Store API product listing with the `reg_vn` region returns calculated VND prices and `inventory_quantity` for variants.
3. A product with 20 variants loads in the Store API in < 120 ms p95 on realistic seed (measured in integration test).
4. Weight and dimensions are required fields for new variants (defaults applied for imported rows, flagged in admin).

### VCK-102 Realistic seed engine
Lane PLAT · 8 pts · Slice — · Depends: VCK-005 · Traces: FR-16, NFR-01
As a Developer, I want deterministic realistic data, so that I meet real-world problems (pagination, slow queries, reporting) before production.
1. `make seed-realistic --seed 42` creates ~900 products, 3,500–5,000 variants, 60 categories, 20,000 customers, 100,000 orders across 12 months with weekly and Tết/11.11 seasonality.
2. Base entities are created through Medusa workflows; historical orders via bulk load; total runtime < 20 min on the dev machine.
3. Addresses use real 2-tier admin units (once VCK-401 data exists; placeholder units before); names/phones/emails are synthetic (`0900000xxx`, `@example.test`).
4. `make seed-verify` checks orphans, order totals = sum of lines + shipping − discounts, non-negative stock, link integrity; exits non-zero on any violation.
5. Same seed value produces identical dataset checksums.

### VCK-103 Image pipeline
Lane BE · 3 pts · Slice S1 · Depends: VCK-005 · Traces: FR-01, NFR-09
As a Shopper, I want product images to load fast on mobile, so that browsing feels instant.
1. File module stores uploads in S3-compatible storage (MinIO locally) with public CDN URLs.
2. Storefront image loader requests resized WebP/AVIF variants; original upload limit 5 MB, jpg/png/webp only.
3. Seed attaches 1–6 generated images per product without external network calls.

### VCK-104 Home and category listing
Lane WEB · 5 pts · Slice S1 · Depends: VCK-004 · Traces: FR-01, FR-02, NFR-09
As a Shopper, I want to browse categories with filters and sorting, so that I can narrow 900+ products quickly.
1. Home shows hero, featured categories, new arrivals and best sellers from Store API data.
2. Category page lists 24 products per page with filter by size, colour, price range and sort; filters are reflected in the URL.
3. Pages are ISR with tags `category:<id>`; a second visit is served from cache (header check in E2E).
4. Empty state and "no results for filters" state have clear Vietnamese copy and a reset action.
5. Lighthouse mobile ≥ 90 on a category with 200 products.

### VCK-105 Product detail page
Lane WEB · 5 pts · Slice S1 · Depends: VCK-004 · Traces: FR-01
As a Shopper, I want to choose a variant and see price and stock, so that I know exactly what I am buying.
1. Selecting options updates price, images and stock without full reload; unavailable combinations are disabled.
2. "Hết hàng" state blocks add-to-cart; low stock (< 5) shows "Chỉ còn N sản phẩm".
3. Add to cart opens the cart drawer and announces the update via `aria-live`.
4. Page includes breadcrumbs and related products from the same category.

### VCK-106 Vietnamese search provider
Lane PKG · 5 pts · Slice S2 · Depends: VCK-004 · Traces: FR-02, NFR-02
As a Shopper, I want search that ignores Vietnamese accents and tolerates typos, so that "ao thun" finds "áo thun".
1. `medusa-search-vi-vck` registers index definitions for products (title, description, category names, options, SKU) with Postgres (`unaccent` + trigram) and Meilisearch providers selectable by option.
2. `GET /store/search` matches `contracts/openapi.yaml`; facets return counts for size, colour, category.
3. A relevance set of 50 queries (committed fixture) scores ≥ 90% top-5 hit rate on both providers; results recorded in the PR.
4. p95 < 150 ms on realistic seed at 20 concurrent users; benchmark numbers for both providers are written to ADR-006.
5. Index updates within 10 s after a product update event.

### VCK-107 Search UI
Lane WEB · 2 pts · Slice S2 · Depends: VCK-004 · Traces: FR-02
As a Shopper, I want instant suggestions and a results page, so that I find products without knowing categories.
1. Header search shows up to 6 suggestions after 2 characters with 200 ms debounce; keyboard navigable.
2. `/search?q=` renders results and facets from `searchProducts`; empty results suggest popular categories.
3. Works in mock mode against `contracts/fixtures/search-result.json`.

## E2 — Cart, checkout and payments (Sprints 2–4)

### VCK-201 Cart and checkout UI
Lane WEB · 8 pts · Slice S3 · Depends: VCK-004 · Traces: FR-03
As a Shopper, I want a short checkout (contact → address → shipping → payment), so that I can buy in under 2 minutes.
1. Cart drawer and page support quantity change, remove, promo code, and show VND totals from the Store API.
2. Checkout steps validate with Zod; phone format `^0\d{9}$`; errors are inline and announced.
3. Guest checkout works; signed-in customers get saved addresses prefilled.
4. Out-of-stock at completion shows which line failed and keeps the cart intact.
5. Order confirmation page shows order number, items, totals, payment method and next steps.

### VCK-202 COD payment and order confirmation
Lane BE · 3 pts · Slice S3 · Depends: VCK-101 · Traces: FR-04
As an Owner, I want Cash on Delivery enabled, so that customers who distrust online payment can still buy.
1. COD is registered as a payment provider for `reg_vn`; completing a COD cart creates an order with payment status "awaiting".
2. `order.placed` triggers `vck.notification.requested` (ORDER_CONFIRMED) exactly once per order.
3. COD can be disabled per shipping zone via option without code change.

### VCK-203 VNPay payment provider and IPN
Lane PKG · 8 pts · Slice S5 · Depends: VCK-208 · Traces: FR-04, NFR-04, NFR-07
As a Shopper, I want to pay with VNPay, so that I can use my bank card or QR.
1. Initiating a VNPay session returns a signed redirect URL whose params match docs/03 §4.1; all golden vectors pass.
2. The IPN handler follows docs/03 §4.2 exactly: bad hash → 97, unknown ref → 01, repeat → 02, amount diff → 04, success → 00.
3. Delivering the same successful IPN 5 times concurrently creates exactly one order and one MATCHED recon row.
4. A successful IPN for a cancelled cart creates no order and a MISMATCH `LATE_PAYMENT_AFTER_CANCEL`.
5. `verifyVnpayReturn` never mutates state (asserted by DB snapshot before/after).
6. Sandbox run against the real VNPay sandbox is recorded as fixtures and any [verify] items in docs/03 are resolved.

### VCK-204 VNPay reconciliation job
Lane PKG · 5 pts · Slice S5 · Depends: VCK-203 · Traces: FR-05, NFR-04
As an Owner, I want payments without IPN to be checked automatically, so that no customer is charged without an order.
1. Every 5 min, PENDING_QUERY rows older than 15 min (batch ≤ 100) are queried via `querydr`; outcomes apply the IPN rules.
2. Only one worker runs the job at a time (Redis lock); a second instance logs and exits.
3. After 24 h without a final status the row becomes MISMATCH `ORDER_NO_PAYMENT` and the cart reservation is released.
4. `vck_recon_mismatch_total{reason}` increments and `vck.payment.mismatch_detected` is emitted for each mismatch.

### VCK-205 VNPay refund
Lane PKG · 3 pts · Slice — · Depends: VCK-203 · Traces: FR-06
As Staff, I want to refund VNPay payments from the order page, so that returns are handled without the VNPay portal.
1. Medusa admin refund on a VNPay payment calls the provider refund with full (02) or partial (03) type.
2. Refund amount > captured − refunded is rejected before calling VNPay.
3. A timed-out refund is retried with the same `vnp_RequestId`; duplicate refunds are impossible (test with simulator fault mode).

### VCK-206 VNPay checkout and return UI
Lane WEB · 5 pts · Slice S5 · Depends: VCK-004 · Traces: FR-04
As a Shopper, I want clear feedback after paying, so that I trust the shop even when confirmation is delayed.
1. Choosing VNPay redirects to the provider URL returned by the session; a loading state prevents double submit.
2. Return page shows PAID with order link, PENDING_CONFIRMATION with polling up to 30 s, or FAILED/CANCELLED with retry.
3. Messages follow docs/03 §4.6 mapping.
4. Works in mock mode with `vnpay-return-pending.json`.

### VCK-207 Oversell protection
Lane BE · 5 pts · Slice S3 · Depends: VCK-101 · Traces: NFR-03
As an Owner, I want stock to never go negative under concurrent checkouts, so that I never sell what I do not have.
1. Integration test: 500 concurrent completions for a variant with 10 units → exactly 10 orders, 490 `out-of-stock` problems.
2. Failed completions release reservations (compensation) — verified by stock = 0 and reserved = 0 at the end.
3. Test runs in CI in < 60 s and is tagged `concurrency`.

### VCK-208 VNPay simulator
Lane PLAT · 3 pts · Slice — · Depends: VCK-002 · Traces: NFR-04
As a Developer, I want a local VNPay simulator with fault modes, so that payment edge cases are testable without the sandbox.
1. `tools/sims/vnpay` serves a pay page, sends signed IPNs, and implements `querydr`/`refund` endpoints.
2. Fault modes: duplicate IPN (n times), delayed IPN, out-of-order, missing IPN, wrong amount, bad hash, refund timeout.
3. The simulator reproduces every golden vector byte-for-byte.

## E3 — Customer accounts (Sprints 2–6)

### VCK-301 Registration, login, verification, reset
Lane BE · 5 pts · Slice S4 · Depends: VCK-005 · Traces: FR-07, NFR-07
As a Shopper, I want to create an account and recover it, so that I can track orders and reorder easily.
1. Email/password registration with email verification (Medusa verification support) before first sign-in is completed.
2. Password reset emails are sent via the notification pipeline; tokens expire in 30 min and are single-use.
3. Login is rate-limited to 5 attempts/min/IP and 10/hour/account with a generic error message.
4. Guest orders with the same email can be attached to the new account after verification.

### VCK-302 Account dashboard UI
Lane WEB · 5 pts · Slice S4 · Depends: VCK-004 · Traces: FR-08
As a Customer, I want a dashboard with profile, addresses and orders, so that I manage everything in one place.
1. Sign-up, sign-in, verify, forgot/reset password pages with inline validation.
2. Orders list (paginated) with status badges and order detail with items, totals and payment status.
3. Address book CRUD with a default address.
4. Account pages are never cached (dynamic) and redirect to sign-in when the session expires.

### VCK-303 Wishlist API
Lane BE · 3 pts · Slice S9 · Depends: VCK-301 · Traces: FR-08
As a Customer, I want to save variants for later, so that I can come back and buy them.
1. `wishlist` module with unique (customer, variant); endpoints match the contract; add is idempotent.
2. Deleted or unpublished variants are excluded from responses without errors.
3. Max 200 items per customer (409 `conflict` beyond).

### VCK-304 Account deletion
Lane BE · 2 pts · Slice S9 · Depends: VCK-301 · Traces: FR-08, NFR-08
As a Customer, I want to delete my account, so that my personal data is not kept longer than needed.
1. `requestAccountDeletion` schedules deletion 30 days ahead and emits `vck.customer.deletion_scheduled`.
2. The daily anonymiser replaces name, email, phone and addresses with irreversible placeholders; orders keep totals.
3. Signing in during the grace period cancels the request (documented in the confirmation email).

## E4 — Addresses and shipping (Sprints 3–4)

### VCK-401 VN address plugin
Lane PKG · 5 pts · Slice S6 · Depends: VCK-004 · Traces: FR-09
As a Shopper, I want to pick my province and ward from current official lists, so that my parcel is routed correctly.
1. `medusa-vn-address-vck` seeds provinces and wards from a documented source with licence recorded in ADR-012.
2. List endpoints match the contract and return in < 50 ms with `Cache-Control: public, max-age=86400`.
3. `resolveLegacyAddress` maps old 3-tier inputs: exact → RESOLVED, split wards → AMBIGUOUS with candidates, unknown → NOT_FOUND; 100-case fixture passes.
4. Each ward stores the GHN code when mappable; unmapped wards are listed by `make address-report`.

### VCK-402 GHN quote and waybill creation
Lane PKG · 8 pts · Slice S6 · Depends: VCK-401 · Traces: FR-10, NFR-06
As an Owner, I want live shipping fees and automatic waybills, so that customers pay the right fee and staff skip manual entry.
1. `quoteShipping` returns GHN fee and ETA within 3 s or a `TIMEOUT` quote; FLAT_RATE is always present.
2. Circuit breaker opens after 5 failures in 30 s and returns UNAVAILABLE without calling GHN.
3. Creating a fulfillment creates a GHN order with COD amount for COD orders; workflow rollback cancels it.
4. Missing variant weight uses defaults and logs a WARN with product id once per product per day.

### VCK-403 GHN webhook and tracking
Lane PKG · 3 pts · Slice S6 · Depends: VCK-402 · Traces: FR-10
As a Customer, I want to see where my parcel is, so that I do not have to call the shop.
1. `/hooks/ghn` rejects bad tokens (401) and dedupes repeats; stale statuses are stored but do not change current status (docs/03 §6.3).
2. Forward transitions emit `vck.shipment.status_changed`; DELIVERED marks the fulfillment delivered.
3. `getOrderTracking` returns the timeline for the customer's own order only (404 otherwise).

### VCK-404 Address form UI
Lane WEB · 3 pts · Slice S6 · Depends: VCK-004 · Traces: FR-09
As a Shopper, I want a fast address form with searchable province and ward pickers, so that entering an address is painless.
1. Province → ward cascading selects with Vietnamese accent-insensitive filtering.
2. Saved legacy addresses trigger `resolveLegacyAddress`; AMBIGUOUS asks the user to choose.
3. Keyboard and screen-reader accessible (combobox pattern).

### VCK-405 Shipping step and tracking page
Lane WEB · 3 pts · Slice S6 · Depends: VCK-004 · Traces: FR-10
As a Shopper, I want to compare shipping options and later track my order, so that delivery is predictable.
1. Checkout shipping step shows quotes with fee and ETA; TIMEOUT/UNAVAILABLE quotes are hidden with a note.
2. Tracking page renders the timeline from `getOrderTracking` with localized status labels.
3. Works in mock mode with `shipping-quote.json`.

### VCK-406 Guest order access module (lookup, OTP, COD self-cancel)
Lane PKG · 5 pts · Slice S10 · Depends: VCK-403, VCK-602 · Traces: FR-17, NFR-07, NFR-08
As a buyer without an account, I want to find my order with its code and my phone and cancel it while it is unconfirmed, so that I do not have to call the shop.
1. `createOrderLookup` returns 200 + token only when display id and phone both match; every mismatch returns the same 404 body, and success vs failure p50 latency differs by < 50 ms over 200 runs (TS-20).
2. Option limits are enforced from Redis counters: 10 attempts / 10 min / IP → 429 with `Retry-After`; 5 failures per display id → 15 min lock; `captcha_required` after 3 IP failures.
3. No lookup response contains the seed customer's raw name, phone or street (contract test scans payloads); masking follows `options.masking`.
4. Token is 256-bit, accepted only in `X-Order-Lookup-Token`, expires after 15 min and is bound to one order; other orders or expired tokens → 401.
5. `requestGuestCancelOtp` evaluates policy first (409 + `reason`), stores the 6-digit code as HMAC, sends via ZNS then SMS, enforces 60 s cooldown and 5 sends/h (429); 5 wrong codes lock the challenge.
6. Option A policy: only `pending` + COD orders are cancellable; paid orders report `payment_mode_not_allowed`; a staff confirmation between OTP and verify yields 409 with no partial state (TS-21, 50 iterations).
7. A successful cancel restocks, emits a schema-valid `vck.order.guest_cancelled`, requests the ORDER_CANCELLED notification, and writes `guest_access_event` + `audit_log` (actor `guest:<hash>`).
8. Options are Zod-validated at load; enabling `online` payment modes without a matching `RefundAdapter` fails startup with a named error; ports and options are documented in the README (docs/14 §3–4).

### VCK-407 Guest order lookup page UI
Lane WEB · 3 pts · Slice S10 · Depends: VCK-405 · Traces: FR-17
As a buyer, I want a simple page to track or cancel my order without signing in, so that checking an order takes seconds.
1. Page matches `pages/order-lookup.md` and prototype boards `Track`/`MobileTrack`; runs in mock mode on the `order-lookup-*.json` fixtures.
2. Handles 404 (generic copy), 429 (countdown from `Retry-After`, captcha widget when `captcha_required`), 401 (expired session → back to the form with values kept).
3. The cancel action renders only when `actions.can_cancel`; otherwise reason-specific help is shown (paid online → contact support link).
4. OTP input uses `inputmode="numeric"` and `autocomplete="one-time-code"`, shows the resend countdown and announces errors with `role="alert"`.
5. The token lives in memory/sessionStorage only — never in the URL, localStorage or analytics — and is cleared by "Tra cứu đơn khác".

### VCK-408 Guest cancel for online-paid orders (option B)
Lane PKG · 5 pts · Slice S10 · Depends: VCK-406, VCK-205, VCK-505 · Traces: FR-17, FR-06 · Backlog (after R1.1)
As an Owner, I want paid guests to cancel unconfirmed orders with an automatic refund, so that support handles fewer calls.
1. A `vnpay-refund` adapter wraps the VCK-205 refund workflow; a `vietqr-manual-refund` adapter creates a REFUND_PAYMENT reconciliation row for staff.
2. Enabling `paymentModes: ["cod", "online"]` changes only options and adapter registration — no diff in the module core.
3. If the refund fails after the order is cancelled, the order stays cancelled, a `vck.payment.mismatch_detected` row is raised, and the buyer sees "hoàn tiền đang được xử lý".
4. `vck.order.guest_cancelled.data.refund` is populated (required, adapter, amount); TS-22 covers the VNPay sandbox refund and its failure path.

## E5 — Admin operations (Sprints 4–5)

### VCK-501 KPI dashboard
Lane ADM · 5 pts · Slice — · Depends: VCK-102 · Traces: FR-12
As an Owner, I want revenue, orders, AOV and top products at a glance, so that I know how the shop is doing.
1. `getKpiReport` returns totals and series with Asia/Ho_Chi_Minh day boundaries; matches a SQL oracle on the seed.
2. Admin home widget shows 7/30/90-day toggles, a revenue chart and top 10 products.
3. Response p95 < 300 ms on realistic seed using `mv_daily_sales` refreshed every 15 min.

### VCK-502 CSV import and export
Lane ADM · 5 pts · Slice — · Depends: VCK-101 · Traces: FR-11, FR-12
As Staff, I want to import and export products by spreadsheet, so that bulk edits take minutes, not days.
1. Upload runs a dry-run by default and returns per-row errors (row, column, message) without writing.
2. Confirmed import of 900 products with variants completes in < 5 min as a background job with progress.
3. Export produces the same column layout so export → edit → import round-trips without errors.
4. Import is idempotent by SKU (re-running updates, never duplicates).

### VCK-503 Packing slips
Lane ADM · 3 pts · Slice — · Depends: VCK-402 · Traces: FR-12
As Staff, I want to print packing slips for many orders at once, so that packing is fast and accurate.
1. Selecting up to 200 orders produces one PDF, one A6 slip per page with order no., items, COD amount, tracking code, barcode.
2. Generation of 200 slips completes in < 10 s.
3. Vietnamese diacritics render correctly (embedded font).

### VCK-504 Staff roles and audit log
Lane ADM · 5 pts · Slice — · Depends: VCK-005 · Traces: FR-12
As an Owner, I want to see who changed what, so that staff actions are accountable.
1. Every mutating admin request (core and custom) writes an `audit_log` row via middleware: actor, action, entity, entity_id, diff.
2. App DB role has no UPDATE/DELETE on `audit_log` (migration test proves it).
3. Admin page lists audit entries with filters by actor and entity, cursor-paginated.
4. Staff accounts can be restricted from refunds and imports (role flag checked by middleware) — tests for allow/deny.

### VCK-505 Reconciliation console
Lane ADM · 5 pts · Slice — · Depends: VCK-204 · Traces: FR-05
As an Owner, I want a list of payment mismatches with actions, so that every VND is accounted for.
1. Admin route lists recon rows filterable by status with reason, amounts and links to cart/order.
2. Resolve actions (CAPTURE_ORDER, REFUND_PAYMENT, MARK_RESOLVED) require a note and `If-Match`; stale version → 412.
3. Every resolution writes an audit entry and emits `vck.payment.reconciled`.
4. Unmatched bank transfers (VCK-604) appear here for manual assignment to a cart.

## E6 — Notifications and engagement (Sprints 5–6)

### VCK-601 Email notifications
Lane BE · 3 pts · Slice — · Depends: VCK-202 · Traces: FR-13
As a Customer, I want emails for order, payment and shipping events, so that I always know the status.
1. Templates ORDER_CONFIRMED, PAYMENT_RECEIVED, SHIPPED, DELIVERED, PASSWORD_RESET, EMAIL_VERIFY render in Vietnamese with order data.
2. Each notification is sent once per (template, entity) even if events are redelivered.
3. Mailpit receives all emails locally; provider failures retry 3 times then log ERROR.

### VCK-602 Zalo ZNS notification provider
Lane PKG · 3 pts · Slice — · Depends: VCK-601 · Traces: FR-13
As a Customer, I want order updates on Zalo, so that I see them where I already chat.
1. `medusa-notification-zns-vck` implements the Notification Module Provider with template-id mapping via options.
2. `mode: "mock"` records messages for tests; phone numbers are normalised to `84…` and never logged unmasked.
3. Channel choice falls back to email when ZNS fails or the customer has no phone.

### VCK-603 Verified-purchase reviews
Lane BE · 5 pts · Slice S9 · Depends: VCK-301 · Traces: FR-14
As a Customer, I want to review products I bought, so that other shoppers can trust the ratings.
1. `createProductReview` succeeds only for delivered orders of that customer containing the product (else 403).
2. One review per (customer, product, order); duplicates → 409.
3. New reviews are PENDING; approved reviews appear in `listProductReviews` with summary distribution.
4. Author name is masked ("Khai P."); images limited to 5, 2 MB each.

### VCK-604 VietQR bank-transfer payment
Lane PKG · 5 pts · Slice S8 · Depends: VCK-204 · Traces: FR-04, FR-05
As a Shopper, I want to pay by scanning a VietQR code, so that I can pay from any banking app without fees for the shop.
1. `getVietqrInstruction` returns a unique memo, exact amount and EMVCo payload; expires in 30 min.
2. Webhook matcher (pure function, 40-case fixture) handles memo with spaces/lowercase/diacritics and extra text.
3. Exact match completes the order; under/over-payment or expired memo → MISMATCH; duplicates ignored.
4. Unmatched transactions are stored for manual assignment (VCK-505-AC4).

### VCK-606 Wishlist, reviews and deletion UI
Lane WEB · 5 pts · Slice S9 · Depends: VCK-004 · Traces: FR-08, FR-14
As a Customer, I want to save items, read and write reviews, and delete my account, so that I control my experience.
1. Heart button on PLP/PDP toggles wishlist with optimistic update and rollback on error.
2. PDP shows rating summary and paginated reviews; eligible customers see a review form from the order page.
3. Account settings has "Xoá tài khoản" with confirmation dialog explaining the 30-day grace period.

### VCK-607 VietQR checkout UI
Lane WEB · 3 pts · Slice S8 · Depends: VCK-004 · Traces: FR-04
As a Shopper, I want the QR, bank details and a countdown on one screen, so that I can transfer correctly.
1. Renders QR from `qr_payload`, bank, account, amount and memo with copy buttons.
2. Polls order status every 5 s up to expiry, then shows "Đã hết hạn" with a new-instruction action.
3. Works in mock mode.

## E7 — SEO and performance (Sprint 6)

### VCK-701 SEO foundation
Lane WEB · 5 pts · Slice — · Depends: VCK-105 · Traces: FR-15, NFR-09
As an Owner, I want pages Google understands, so that the shop gets organic traffic.
1. Unique title/description/canonical per page; Open Graph images for PDPs.
2. JSON-LD `Product` (offers, availability, aggregateRating when reviews exist), `BreadcrumbList`, `Organization`.
3. `sitemap.xml` (split ≥ 5,000 URLs) and `robots.txt`; Rich Results test passes for 3 sample PDPs (screenshots in PR).

### VCK-702 Product feeds
Lane BE · 3 pts · Slice — · Depends: VCK-101 · Traces: FR-15
As an Owner, I want Google Merchant and Meta/TikTok catalog feeds, so that I can run shopping ads.
1. Hourly job writes both feeds to storage; routes serve the latest file with ETag.
2. Feed includes id, title, description, link, image, price in VND, availability, brand, GTIN when present.
3. Feed for realistic seed validates against the Google feed spec checker (sample of 20 items) with 0 errors.

### VCK-703 Performance budgets and ISR revalidation route
Lane WEB · 5 pts · Slice — · Depends: VCK-104 · Traces: NFR-01, NFR-09
As a Shopper, I want pages to stay fast and accurate, so that prices and stock are never stale.
1. CI runs Lighthouse CI on home/PLP/PDP with budgets (≥ 90 perf, JS ≤ 170 KB gz); failing budgets fail the PR.
2. `/api/revalidate` verifies an HMAC signature and revalidates given tags; bad signature → 401.
3. p95 TTFB targets from NFR-01 met in a local k6 smoke run (numbers in PR).

### VCK-704 Revalidation subscriber
Lane BE · 2 pts · Slice — · Depends: VCK-101 · Traces: NFR-01
As an Owner, I want price and stock changes to appear on the storefront within seconds, so that customers see correct data.
1. `product.updated`, price-list and `inventory-level.updated` events call the storefront revalidate route with affected tags within 5 s.
2. Bursts are coalesced (max 1 call per tag per 2 s); failures retry 3 times and log WARN.

### VCK-705 Signature interactions and motion audit
Lane WEB · 5 pts · Slice — · Depends: VCK-105, VCK-201 · Traces: NFR-09
As a Shopper, I want the shop to feel smooth and alive without slowing me down, so that browsing and buying are enjoyable.
1. MI-19 shared product image PLP → PDP via View Transitions with fade fallback; back navigation restores scroll position.
2. Every MI in docs/13 §5 is implemented or explicitly deferred in PROGRESS with a reason; each uses motion tokens only.
3. TS-19 passes: reduced-motion journeys, rapid-interaction correctness, INP < 200 ms, CLS < 0.1, no GSAP chunk outside home.
4. A 60–90 s interaction reel (desktop + mobile) is recorded for the portfolio case study.

## E8 — Resilience and operations (Sprint 7)

### VCK-801 Stress seed mode
Lane PLAT · 3 pts · Slice — · Depends: VCK-102 · Traces: FR-16, NFR-02
As a Developer, I want a stress dataset, so that I can find where search, admin lists and reports break.
1. `make seed-stress` creates 50,000 products and 1,000,000 orders on staging within 3 h.
2. A report lists the 10 slowest admin/store queries with EXPLAIN plans; findings become BUG files or stories.
3. Search p95 < 400 ms on stress data (NFR-02) or an ADR explains the gap and mitigation.

### VCK-802 Load test suite
Lane PLAT · 5 pts · Slice — · Depends: VCK-703 · Traces: NFR-01, NFR-03, NFR-06
As an Operator, I want repeatable load tests, so that I know the capacity of the demo server.
1. k6 scenarios browse, search, checkout-cod, flash-sale with thresholds from NFR-01/03/06.
2. Results (p50/p95/p99, errors, RPS, CPU/RAM) are exported as JSON and summarised in RELEASE notes.
3. Flash-sale scenario confirms 0 oversell with 500 VUs on 10 units against the deployed stack.

### VCK-803 Chaos suite
Lane PLAT · 5 pts · Slice — · Depends: VCK-208, VCK-402 · Traces: NFR-04, NFR-05, NFR-06
As an Operator, I want scripted failures, so that recovery is proven, not assumed.
1. Scenarios: duplicate IPN ×5, out-of-order IPN, missing IPN, worker kill during completion, Redis restart, GHN 3 s latency, GHN 30% errors.
2. Each scenario asserts its invariant (TS-10..16) and prints PASS/FAIL with evidence.
3. All scenarios pass on staging; failures become BUG files before R1.0.

### VCK-804 Production deployment and backups
Lane PLAT · 8 pts · Slice — · Depends: VCK-003 · Traces: NFR-10, NFR-12
As an Operator, I want one-command deploys and restorable backups, so that the demo is reliable.
1. Tag push builds images, runs migrations as a one-off job, deploys server/worker/storefront with zero-downtime rollover.
2. Postgres WAL archiving to object storage (RPO ≤ 5 min) and nightly base backups retained 14 days.
3. Restore drill from backup to a fresh instance completes in ≤ 1 h and is documented in a runbook.
4. TLS, security headers and firewall (only 80/443/22 with key auth) verified by a checklist in the PR.

### VCK-805 Runbooks and alerts
Lane PLAT · 3 pts · Slice — · Depends: VCK-007 · Traces: NFR-10
As an Operator, I want alerts with runbooks, so that I know what to do at 2 a.m.
1. Alerts: 5xx rate > 2% for 5 min, checkout p95 > 1.5 s, recon mismatches > 0 in 1 h, job failures, disk > 80%, backup missing.
2. Each alert links a runbook in `docs/runbooks/` with diagnosis steps and rollback.
3. Alerts delivered to Telegram; a fire drill for two alerts is recorded.

### VCK-806 Public demo mode
Lane PLAT · 3 pts · Slice — · Depends: VCK-804 · Traces: NFR-11
As a prospective client, I want to explore the shop and admin safely, so that I can judge the quality myself.
1. A read-only admin account can view everything but mutations return 403 with a friendly message.
2. Nightly job restores the realistic seed snapshot in < 15 min.
3. Demo banner explains sandbox payments (simulator/VNPay sandbox test cards) and links the case study.
