# Engineering Standards
Version 1.0 · 2026-09-29 · Owner: Tech lead

Rules an experienced engineer applies to a production commerce system. Reviewers (human or requesting-code-review)
check against this document. **MUST** items block merge.

## 0. Domain non-negotiables (MUST)
1. Money is integer VND end to end; the only multiplication by 100 is inside the VNPay adapter (`toVnpAmount`).
2. An online-paid order is created only by the IPN/reconciliation/bank-webhook workflows (ADR-007).
3. Every provider callback: authenticate → dedupe → validate → act, in that order; idempotent under redelivery.
4. Inventory is decremented/reserved only inside workflows; concurrent checkout tests guard every change there.
5. PII (names, phones, addresses, emails) never in logs, events, URLs, search indexes or analytics payloads.
6. Every admin mutation writes an AuditLog entry with actor, action, entity, diff.
7. Customer deletion anonymises PII while keeping financial records consistent (orders keep totals, lose identity).

## 1. Principles
| Principle | What it means here | Example |
| --- | --- | --- |
| Single Responsibility | One reason to change | `verifyVnpaySignature()` only verifies; the IPN workflow decides |
| Open/Closed | Extend by adding | New carrier = new fulfillment provider; checkout code unchanged |
| Liskov Substitution | Providers honour the interface incl. errors/timing | Every payment provider passes `tests/payment-provider.contract.ts` |
| Interface Segregation | Small consumer-owned interfaces | Recon job depends on `TransactionQuery` (one method), not the whole VNPay client |
| Dependency Inversion | Workflows depend on module services/ports | `reconcile-payments` resolves `PaymentQueryPort`, not `fetch` |
| KISS / YAGNI | Build what the story needs | No generic "payment orchestration engine" until the 3rd wallet |
| DRY (rule of three) | Abstract on the third real duplicate | VNPay and MoMo share recon module only once MoMo exists |
| Fail fast | Validate options/env at boot | Missing `VNPAY_HASH_SECRET` ⇒ plugin throws at load |
| Explicit over implicit | Typed config, container resolution by constant keys | `Modules.PAYMENT`, not string literals scattered |
| Illegal states unrepresentable | Types encode invariants | `Vnd` branded type; `ShipmentStatus` union + transition table |

## 2. Architecture rules
- Medusa layering: **route/subscriber/job (inbound adapter) → workflow (application) → step → module service (domain + persistence) / provider (outbound adapter)**.
- Routes, subscribers and jobs contain no business rules; they parse, call one workflow, map the result.
- Pure domain logic (signing, matching, status mapping, price rules) lives in `src/lib` as framework-free functions.
- Modules never import other modules; relations via links, orchestration via workflows.
- Plugins (`packages/`) never import from `apps/`; apps import plugins only via their public entry.
- Storefront: `app/` routes compose `features/*`; features never import each other's internals (index barrel only).
- Enforced by `eslint-plugin-boundaries` + `dependency-cruiser` rules in CI.

## 3. Design patterns (use for the named problem)
| Pattern | Problem | Where |
| --- | --- | --- |
| Saga (workflow + compensation) | Multi-step side effects across modules/providers | checkout completion, IPN, refund, fulfillment |
| Strategy | Interchangeable providers | payment (COD/VNPay/VietQR), fulfillment (GHN/flat), search, notification |
| Adapter / Port | Isolate providers and SDKs | `packages/*/src/providers` |
| State machine (table) | Legal transitions | shipment status, reconciliation status, review moderation |
| Idempotency key / Inbox | Safe redelivery | `provider_event`, `processed_event`, `Idempotency-Key` |
| Transactional outbox (Medusa event bus in workflow) | Events only after commit | emit events from workflow steps, not routes |
| Circuit breaker + fallback | Protect checkout from carrier outages | GHN quote → FLAT_RATE |
| Retry with backoff + jitter | Transient provider errors | outbound clients (idempotent ops only) |
| Specification | Composable eligibility rules | review eligibility (verified purchase, not already reviewed) |
| Value object | Invariants on small values | `Vnd`, `TxnRef`, `TransferMemo`, `WardCode` |
| Read model | Heavy reporting | `mv_daily_sales` for KPI |
| Repository (via MedusaService) | Persistence | custom modules |

Anti-patterns that fail review: logic in route handlers; raw SQL across module tables; boolean flag parameters;
`utils.ts` dumping grounds; swallowing errors; `any`; string statuses outside unions; singletons with mutable state;
provider calls inside a DB transaction; client components fetching in `useEffect`.

## 4. Code conventions
### 4.1 All languages
- Names from the glossary (root CLAUDE.md §8). Functions are verbs, booleans predicates, collections plural.
- Functions ≤ ~30 lines, ≤ 4 params (object beyond), cyclomatic complexity ≤ 10; files ≤ ~300 lines.
- No magic numbers/strings: `VNPAY_SESSION_TTL_MINUTES = 15`, `ProblemType.OutOfStock`.
- Comments explain why and cite docs (`// docs/03 §4.2: amount check before status`); TODO needs a BUG/story id.
- Formatting automatic (Prettier); lint (ESLint) is the style authority — never argue style in review.

### 4.2 TypeScript (backend, plugins, storefront)
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; no `any`, no non-null `!` except in tests.
- `unknown` + Zod at every trust boundary (HTTP, webhooks, env, CSV rows, provider responses).
- Discriminated unions for results: `type IpnOutcome = { kind: "paid" } | { kind: "declined"; code: string } | ...`.
- Named exports; one exported concept per file; barrel `index.ts` only at package/feature root.
- Async: always `await` or return promises; no floating promises (`@typescript-eslint/no-floating-promises`);
  `AbortSignal.timeout()` on every fetch.
- Errors: `MedusaError` with types in routes; domain errors as typed classes carrying a `ProblemType`.
- Dates: `Temporal`-style discipline via `date-fns-tz`; never `new Date(string)` on provider formats — use parsers.

### 4.3 Medusa specifics
- DML models with explicit indexes; `MedusaService` for CRUD; custom methods decorated with `@InjectManager`/`@InjectTransactionManager`.
- Steps: `createStep(name, invoke, compensate)`; compensation receives only what invoke returned; steps are idempotent.
- Workflows: named `<verb>-<noun>-workflow`; input/output types exported; no side effects outside steps.
- Admin UI: `@medusajs/ui` components, `defineWidgetConfig`/`defineRouteConfig`, data via JS SDK + React Query.

### 4.4 Next.js / React
- Server Components by default; client components small and leaf-level; props serialisable.
- Data via server loaders with cache tags; mutations via Server Actions returning typed results.
- Components pure; hooks `useX` for effects; stable keys; derived state computed not stored.
- Tailwind with tokens from `ui-kit`; accessibility is part of done (labels, focus, `aria-live`).

### 4.5 SQL
Explicit columns; parameterised only; lock intentionally with a comment citing the story; hot queries backed by an
index listed in docs/05 §6 with EXPLAIN in the PR.

## 5. Error handling
- Classes: **validation** (400), **business outcome** (value, not exception — e.g. declined payment), **conflict** (409),
  **transient** (retry with cap), **fatal** (bug/config → 500 + alert).
- One problem mapper per app (`src/lib/errors.ts`); never leak stack traces, SQL, or provider messages to clients.
- Retry only idempotent operations with backoff + jitter, max 3; log the final failure once at WARN/ERROR.
- Every `catch` either handles (with a log explaining the decision) or rethrows wrapped with context (`cause`).

## 6. Observability
- Levels: ERROR = human action; WARN = degraded but handled; INFO = business events (one line per order/payment/shipment outcome); DEBUG off by default.
- Structured JSON, constant messages, data in fields (docs/02 §7.6). Redaction helper for phone/email/address.
- Metrics RED for every inbound interface, USE for pools/queues; names `vck_<noun>_<unit>`; no high-cardinality labels (no ids).
- Traces: span per request, workflow step, outbound call; attributes `vck.txn_ref`, `vck.carrier`, `vck.workflow`.

## 7. Security
- Secrets from env only; `.env*` git-ignored; gitleaks in CI; separate keys per environment.
- Validate all input at the edge; reject unknown fields in admin/hook payloads we own.
- Webhook auth before body processing; constant-time compare (`crypto.timingSafeEqual`).
- CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` on storefront; admin behind separate subdomain.
- Dependencies pinned; Renovate weekly; no critical CVEs (`pnpm audit --prod` + OSV in CI); licences MIT/Apache/BSD/ISC.
- Rate limits per docs/02 §7.1; login brute-force protection; admin 2FA when Medusa supports it (tracked in R-list).

## 8. Concurrency and consistency
- One workflow per business operation; no network calls inside DB transactions.
- Optimistic `version` for admin edits of recon/review; Medusa locking for inventory; Redis locks for jobs.
- Idempotency at every boundary (docs/02 §7.2). Timeouts on every I/O. Graceful shutdown: stop intake → drain 20 s → close.

## 9. Performance
Measure first (k6/Lighthouse/EXPLAIN in PR); no N+1 (`query.graph` with needed fields only); cache catalogue reads
with tags; bounded batch sizes in jobs; images WebP/AVIF via CDN; route JS budgets per storefront CLAUDE.md.

## 10. Testing
See `08-test-strategy.md`. AAA structure; one behaviour per test; fakes over mocks (in-memory provider fakes,
simulators); deterministic clocks and seeds; AC id in every test name.

## 11. Git and pull requests
- Conventional Commits: `feat|fix|refactor|test|docs|chore|perf|build|ci(scope): summary (VCK-<id>)`,
  scope = lane (`plat`, `be`, `adm`, `pkg`, `web`, `contracts`).
- One story per PR; ≤ 400 changed lines excluding generated; draft early for large stories; squash merge only.
- Changesets for any user-visible package change (feeds RELEASE notes).

## 12. Code review checklist
- [ ] Every AC proven by a named test that fails without the change
- [ ] Layering: no logic in routes/subscribers; no cross-module imports; plugin ↛ app
- [ ] Money, payment-truth, idempotency, PII rules (§0) honoured
- [ ] Errors classified and mapped once; no swallowed errors; timeouts set
- [ ] Concurrency: locks/versions/idempotency where state is shared
- [ ] Observability added; no sensitive data; bounded label cardinality
- [ ] Contracts respected; generated code untouched; migrations forward-only
- [ ] Names, function size, comments explain why
- [ ] Docs updated (05/03/ADR/PROGRESS/BUG/RELEASE as applicable)

## 13. Documentation
ADR for hard-to-reverse or cross-lane decisions; package READMEs; runbook per alert (`docs/runbooks/`); plans kept after
merge; PROGRESS/BUG/RELEASE lifecycle per `docs/12`.
