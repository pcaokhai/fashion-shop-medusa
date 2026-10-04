# Test Strategy and Scenarios
Version 1.0 · 2026-09-29 · Owner: Tech lead

## 1. Principles
Test first (TDD via Superpowers); AC ids in test names (`[VCK-203-AC3]`); assert invariants (money, stock, exactly-once),
not implementation; deterministic clocks, seeds and simulators; no live provider sandboxes in CI; fixtures only.

## 2. Pyramid
| Level | Scope | Tools | Owner | Runs |
| --- | --- | --- | --- | --- |
| Unit | pure `src/lib` (signing, matching, mapping, money) | Jest/Vitest | all | every PR |
| Property | money math, memo matcher, status machine | fast-check | PKG/BE | every PR |
| Integration | modules, workflows, routes with real Postgres/Redis | Medusa test utils + Testcontainers | BE/PKG/ADM | every PR (affected) |
| Contract (provider) | custom route responses vs `openapi.yaml`; golden vectors | openapi validator | BE/PKG | every PR |
| Contract (consumer) | storefront against MSW generated from contract | Vitest + MSW | WEB | every PR |
| Component | client components with state | Testing Library | WEB | every PR |
| E2E | journeys §5 on full stack | Playwright | WEB/PLAT | PR to main (smoke), nightly (full) |
| Concurrency | oversell, duplicate IPN | Jest + parallel requests | BE/PKG | every PR (tag `concurrency`) |
| Chaos | §7 scenarios | tools/chaos + sims + toxiproxy | PLAT | nightly on staging, before release |
| Performance | k6 scenarios, Lighthouse CI | k6, LHCI | PLAT/WEB | nightly + release |
| Security | ZAP baseline, gitleaks, audit | ZAP, gitleaks, OSV | PLAT | PR (static), weekly (ZAP) |

## 3. Quality gates
| Gate | Threshold |
| --- | --- |
| Line coverage | backend/plugins ≥ 80%; `src/lib` ≥ 90%; storefront features ≥ 70% |
| Mutation (Stryker, `src/lib` of payment plugins) | ≥ 70% score, weekly |
| Lint/typecheck | 0 errors; 0 new warnings |
| Contracts | Spectral 0 errors; oasdiff no unapproved breaking changes; vectors unchanged |
| Security | 0 secrets; 0 critical CVEs; ZAP 0 high |
| E2E smoke | 100% pass; flaky test ⇒ BUG file within 24 h, quarantined max 7 days |
| Performance | Lighthouse ≥ 90 mobile; k6 thresholds per NFR-01/02/03/06 |

## 4. Test data
- Unit/integration: builders (`aProduct().withVariants(3)`) + `contracts/fixtures`; fixed clock `2026-10-01T03:00:00Z`.
- Realistic seed (VCK-102) for E2E, performance, reporting oracles; stress seed (VCK-801) on staging only.
- `make seed-verify` invariants: no orphan link rows; order total = Σ lines + shipping − discounts; stock ≥ 0;
  reserved ≤ stocked; every captured VNPay payment has a MATCHED/RESOLVED recon row; every order has ≥ 1 line.
- Synthetic PII only; realistic admin units; product texts generated with Vietnamese vocabulary lists (no scraping).

## 5. Critical E2E journeys
1. Browse category → filter → PDP → add to cart → COD checkout → confirmation email in Mailpit.
2. Search "ao thun den" → result → buy with VNPay (simulator success) → PAID return page → order in account.
3. VNPay user cancels → CANCELLED page → retry with COD succeeds with the same cart.
4. Register → verify email → saved address → reorder from order history.
5. VietQR: instruction → simulator bank webhook with lowercase memo → order completed → payment email.
6. Admin: import CSV (dry-run → fix → import) → product visible on storefront within 10 s.
7. Admin: resolve a LATE_PAYMENT_AFTER_CANCEL mismatch by refund → audit entry present.
8. Shipping: GHN quote → fulfillment → webhook DELIVERED → tracking page shows timeline → review form available.

## 6. Scenarios
### TS-01 Accent-insensitive search (VCK-106, VCK-107)
Objective: prove search relevance and latency. Start: realistic seed indexed. Role: Shopper.
Steps: query "ao thun" → hits include "Áo thun…" in top 5; query "quan jean nu" → facets include size/colour; 20 VUs × 2 min.
Expected: ≥ 90% top-5 on relevance set; p95 < 150 ms.

### TS-02 COD checkout (VCK-201, VCK-202)
Objective: happy path order. Start: product in stock. Role: guest Shopper.
Steps: add → address → FLAT_RATE → COD → place. Expected: order created, stock decremented, ORDER_CONFIRMED email once.

### TS-03 Oversell (VCK-207)
Start: variant stock 10. Steps: 500 parallel completions. Expected: 10 orders; 490 out-of-stock problems; stock 0, reserved 0.

### TS-04 VNPay success (VCK-203, VCK-206)
Start: simulator normal. Steps: pay → IPN → return. Expected: one order, recon MATCHED, return PAID with order id.

### TS-05 VNPay return before IPN (VCK-206)
Start: simulator delays IPN 20 s. Expected: return shows PENDING_CONFIRMATION then PAID after polling; no state change by return.

### TS-06 Bad signature (VCK-203)
Steps: send IPN with altered amount but old hash. Expected: RspCode 97; no DB change; WARN log without payload.

### TS-07 Refund (VCK-205)
Start: captured VNPay order. Steps: partial refund 50,000; then full remainder; then attempt extra 1,000.
Expected: two refunds recorded; third rejected before provider call.

### TS-08 Legacy address (VCK-401, VCK-404)
Steps: customer with pre-reform address checks out. Expected: RESOLVED autofills; AMBIGUOUS asks to choose; order stores new codes.

### TS-09 GHN shipping lifecycle (VCK-402, VCK-403, VCK-405)
Steps: quote → create → webhooks picking, delivering, delivered, then stale "picking". Expected: status DELIVERED; stale stored only.

### TS-10 Duplicate IPN ×5 concurrent (VCK-203, VCK-803)
Invariant: exactly one order and one MATCHED recon; responses 00 then 02.

### TS-11 Out-of-order IPN (VCK-203, VCK-803)
Steps: failed-attempt IPN for TxnRef A arrives after success for TxnRef B on same cart. Invariant: order stays; A recorded FAILED.

### TS-12 Missing IPN (VCK-204, VCK-803)
Steps: simulator drops IPN. Invariant: reconciliation completes the order within 20 min (15 + one 5-min cycle).

### TS-13 Late payment after cancel (VCK-203, VCK-505)
Invariant: no order; MISMATCH row; admin refund resolves it with audit entry.

### TS-14 Amount mismatch (VCK-203)
Invariant: RspCode 04; MISMATCH AMOUNT_DIFF; no order.

### TS-15 Worker killed during completion (VCK-803)
Steps: SIGKILL worker between reservation and order creation. Invariant: after restart either order exists or reservation released; never both missing and reserved.

### TS-16 Carrier degradation (VCK-402, VCK-803)
Steps: toxiproxy adds 3 s latency then 30% errors to GHN sim. Invariant: checkout completes with FLAT_RATE; p95 < 1.5 s; breaker opens.

### TS-17 Accessibility (VCK-006, VCK-201, VCK-404)
Steps: axe on home, PLP, PDP, checkout; keyboard-only checkout. Expected: 0 serious violations; checkout completable by keyboard.

### TS-18 Account deletion (VCK-304, VCK-606)
Steps: request deletion; advance clock 30 days; run anonymiser. Expected: PII replaced; orders totals intact; login impossible.

### TS-19 Motion, reduced motion and interaction performance (VCK-009, VCK-705)
Objective: motion never harms usability. Start: realistic seed. Role: Shopper.
Steps: run E2E journeys 1–2 with `prefers-reduced-motion: reduce`; add to cart 5× rapidly; toggle filters rapidly;
measure INP and CLS on PLP/PDP with Lighthouse CI and a Playwright trace.
Expected: journeys pass in both modes; cart count and focus correct after rapid actions; no translate/scale animations
in reduced mode; INP < 200 ms; CLS < 0.1; no GSAP chunk on PLP/PDP/checkout.

### TS-20 Guest lookup enumeration and timing (VCK-406, VCK-407)
Objective: the lookup cannot be used to discover orders or PII. Start: realistic seed. Role: anonymous.
Steps: 200 lookups mixing right code/wrong phone, wrong code/right phone, both right; iterate display ids sequentially
from one IP and from 20 IPs; inspect every response body and header.
Expected: identical 404 body for every mismatch; latency difference success vs failure < 50 ms p50; 429 after 10/10 min/IP;
display id locked after 5 failures; captcha required after 3; no raw name/phone/street anywhere; `guest_access_event` rows written.

### TS-21 Guest OTP cancel and staff race (VCK-406)
Objective: exactly one outcome when a guest cancels while staff confirms. Start: pending COD order.
Steps: request OTP; wrong code ×5 → locked; new OTP; in 50 iterations run `confirmGuestCancel` and admin confirm in parallel;
also verify with an expired OTP and after the resend cooldown.
Expected: each iteration ends either cancelled (restocked, one event) or confirmed (guest gets 409 `not_pending`) — never both;
410 for expired; 429 inside the cooldown or above 5 sends/h; paid orders always 409 `payment_mode_not_allowed` (option A).

### TS-22 Guest cancel with refund — option B (VCK-408, backlog)
Steps: enable online modes with `vnpay-refund`; cancel a paid pending order; repeat with the refund simulator failing.
Expected: success → refund recorded once (idempotency key); failure → order cancelled, mismatch recon row, buyer message
"hoàn tiền đang được xử lý".

## 7. Chaos / resilience suite
| Scenario | Injection | Invariant | TS |
| --- | --- | --- | --- |
| ipn-duplicate | sim sends 5 concurrent IPNs | exactly-once order | TS-10 |
| ipn-out-of-order | sim reorders | final state = latest success | TS-11 |
| ipn-missing | sim drops IPN | recon completes ≤ 20 min | TS-12 |
| worker-kill | `docker kill` worker mid-workflow | no orphan reservation/order | TS-15 |
| redis-restart | restart Redis during checkout load | no lost orders; errors < 2% for ≤ 30 s | — |
| carrier-latency / errors | toxiproxy on GHN sim | checkout unaffected | TS-16 |
| db-failover-drill | restore from backup | RPO ≤ 5 min, RTO ≤ 1 h | — |
