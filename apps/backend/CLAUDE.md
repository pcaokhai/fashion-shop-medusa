# apps/backend — CLAUDE.md
Medusa v2 application: commerce core, custom modules, workflows, custom Store/Admin/Hook routes, subscribers, jobs,
and admin dashboard extensions. Lanes: **BE** owns everything here except `src/admin/**`, `src/api/admin/**` and
`src/modules/{audit_log,import_job,reporting}/**`, which belong to **ADM**.
Runs as two processes from one image: `MEDUSA_WORKER_MODE=server` (HTTP) and `=worker` (subscribers, jobs, workflows).

## Commands
```
pnpm --filter backend dev                  # server (shared mode locally)
pnpm --filter backend test:unit            # jest, no DB
pnpm --filter backend test:integration     # medusa test utils + Testcontainers Postgres/Redis
pnpm --filter backend db:migrate           # medusa db:migrate
pnpm --filter backend db:generate <module> # generate module migration — never hand-edit applied ones
pnpm --filter backend build                # medusa build (.medusa/ is output: never read or edit)
```

## Layout
```
src/modules/<name>/        models/ (DML), service.ts (extends MedusaService), migrations/, index.ts (Module())
src/links/                 defineLink(...) — only place cross-module relations are declared
src/workflows/<feature>/   <verb>-<noun>.ts workflow + steps/ (one step per file, each with compensation)
src/api/store|hooks/...    route.ts (GET/POST handlers), validators.ts (Zod), middlewares.ts registration
src/api/admin/...          ADM lane — same rules
src/subscribers/           <event>.ts → call a workflow; no business logic inline
src/jobs/                  scheduled jobs (reconciliation, feeds, cleanup) — idempotent, bounded batch size
src/admin/widgets|routes/  ADM lane — Medusa UI components only (@medusajs/ui), React Query via JS SDK
src/lib/                   money.ts, errors.ts (problem mapper), logger.ts, flags.ts, otel.ts
```

## Medusa rules
- Route handler = parse (Zod) → `workflow.run({ input })` → map result. No repository/service calls with side effects in routes.
- Reads across modules use `query.graph()`; never join core tables with raw SQL (exception: reporting read-models, ADR required).
- Steps that call external systems store what they need to compensate (e.g. VNPay txn ref, GHN order code).
- Subscribers must tolerate redelivery: check processed-event table or natural idempotency before acting.
- Admin routes check the actor from `req.auth_context`; write an AuditLog entry for every mutating admin action (VCK-504).
- Admin UI structure, states and locked-permission behaviour: `design-system/vn-commerce-kit/pages/admin.md`
  (+ prototype boards `Admin`/`MobileAdmin`, docs/13 §3.1). Keep @medusajs/ui tokens; the prototype palette is a stand-in.
- Feature flags read from `src/lib/flags.ts` (env `FF_*`); a disabled slice's routes return 404.
- Store API custom routes respect v2.21 strict `fields`: expose only allow-listed fields.

## Domain rules
- Money: integer VND via `src/lib/money.ts`; never `number` arithmetic on floats; VNPay ×100 conversion only in the VNPay adapter.
- Order completion for online payments happens in the IPN/reconciliation workflow only (ADR-007).
- Inventory: reservations created at cart completion inside the workflow; oversell test is VCK-207.
- Time: store UTC, compute business days in `Asia/Ho_Chi_Minh`.

## Tests
- Names: `should_<behaviour>_when_<condition> [VCK-<id>-AC<n>]`.
- Integration tests use `medusaIntegrationTestRunner` with a fresh DB per file; fixtures from `contracts/fixtures`.
- Contract tests validate every custom route response against `contracts/openapi.yaml` (openapi-response-validator).
- Concurrency tests (oversell, duplicate IPN) run N parallel requests and assert invariants, not timings.
