# apps/backend — CLAUDE.md
Medusa v2 app: server + worker, custom modules, workflows, API routes, subscribers, jobs, VNPay provider. Lane **BE**.
Medusa is pinned to one minor version (exact). Admin is the stock dashboard: no custom widgets in the demo.

## Layout
```
src/api/store/...      custom store routes (contract: contracts/openapi.yaml)   src/api/hooks/...   IPN + carrier webhooks
src/modules/<name>/    custom modules (own tables, linked by src/links)         src/workflows/      business logic + steps
src/subscribers/ jobs/ events and scheduled work (querydr reconciliation)       src/lib/            pure functions: money, signing, masking
```

## Rules for this app
- Routes: validate with Zod → call a workflow → map the result to the contract. No business logic in routes.
- Money: `src/lib/money.ts` (`Vnd`, `formatVnd`, `toVnpAmount`). Integer VND everywhere; ×100 only inside the VNPay adapter.
- Webhooks: verify the signature first (constant-time compare), dedupe on a unique index, then run a workflow.
  Payment is settled only from a verified IPN or `querydr`, never from the return URL.
- Compensation on every workflow step that has a side effect (reserve stock, create payment, call a carrier).
- Custom tables only in custom modules; relate to core entities with module links, never raw foreign keys.
- Logs: trace id on every line; mask phone and address; never log a full provider payload.
- Outbound HTTP: timeout 5 s (carriers 3 s), max 3 retries with jitter, only for idempotent calls; inject `fetch` in tests.

## Medusa CLI first
`npx medusa db:generate <module>` after changing a custom module's data model · `db:migrate` (also syncs links) · `db:sync-links` ·
`db:rollback <module>` · `exec ./src/scripts/<file>.ts` for seed and one-off scripts · `user -e <email> -p <pw>` for the dev admin
(password from env) · `develop` / `build` / `start`. There is no reset command: drop the database, then `db:setup`.
Scaffold B0 with `npx create-medusa-app@latest` in a temp dir and copy its config into `apps/backend`; base B1a on its `seed.ts`.

## Commands
`pnpm --filter backend dev` (port 9000) · `pnpm --filter backend test` · `make seed` · `make record-fixtures` ·
`make contracts` after any contract change.

## Tests (only these; docs/plan.md §6)
Money, payment truth + IPN (golden vectors in `contracts/vnpay/`), oversell; the two Playwright journeys run via `make e2e`.
Simulators: `tools/sims` (VNPay, GHN). Never call live sandboxes from automated tests.
