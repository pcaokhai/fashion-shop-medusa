# CLAUDE.md — VN Commerce Kit

Production-grade Vietnamese e-commerce starter: Medusa v2 backend + admin, Next.js storefront, and reusable
VN plugins (VNPay, VietQR, GHN, 2-tier addresses, Zalo ZNS). Flow: storefront → Medusa Store API + custom
routes → workflows → modules/plugins → PostgreSQL/Redis/search; providers call back via `/hooks/*`.

This file loads in every session. Keep it short. Read the doc that matches your task — only the section you need.

## 1. Repository map
```
apps/backend/        Medusa v2 server+worker, custom modules, workflows, API   → apps/backend/CLAUDE.md
  src/admin/, src/api/admin/   Admin dashboard extensions (lane ADM)            → apps/backend/CLAUDE.md §ADM
apps/storefront/     Next.js App Router storefront                              → apps/storefront/CLAUDE.md
packages/            Reusable Medusa plugins (medusa-*-vck), ui-kit             → packages/CLAUDE.md
tools/               seed, load (k6), chaos, provider simulators                → tools/CLAUDE.md
design-system/       Curated UI UX Pro Max output: MASTER.md + pages/*.md (lane WEB)
contracts/           openapi.yaml, event schemas, fixtures, VNPay vectors (normative)
infra/               docker compose, deploy, terraform (reference)
docs/                PRD, architecture, stories, plans, ADR, PROGRESS, BUG, RELEASE
```

## 2. Which doc to read
| You are about to… | Read first |
| --- | --- |
| Start any story | `docs/06` (your story only), `docs/07` §3 (slice, deps), `docs/progress/PROGRESS.md` (top block) |
| Touch VNPay/VietQR/GHN | `docs/03` + `contracts/vnpay/golden-vectors.json` |
| Touch REST/events | `contracts/openapi.yaml`, `contracts/events/`, `docs/04` |
| Touch tables/modules/links | `docs/05` |
| Make a design choice | `docs/02`, `docs/adr/` |
| Write tests / seed / load | `docs/08` |
| Write any code | `docs/10` (summary in §6 below) |
| Fix a bug | `docs/12` §3 (BUG record) then systematic-debugging |
| Release a feature | `docs/12` §4 (RELEASE + CHANGELOG + PROGRESS) |
| Plan token use / dispatch subagents | `docs/11` |
| Build or change any UI | `design-system/vn-commerce-kit/MASTER.md` + `pages/<page>.md`, `docs/13` §3.1 (prototype) + §4–6 |
Precedence when docs disagree: accepted ADR > `contracts/` > `docs/03` > `docs/02` > `docs/06` > this file.
Record the conflict as a **Ruling** in the plan and open a `docs:` fix PR.

## 3. Commands (scaffolded by VCK-001/002)
```
make up | down            # postgres, redis, meilisearch, minio, mailpit, vnpay-sim, ghn-sim
make dev                  # backend server + worker + storefront (turbo)
make test                 # unit + integration for changed packages (turbo --filter=...[origin/main])
make test-all | lint | typecheck | fmt
make contracts            # spectral lint, oasdiff breaking check, JSON Schema compile, VNPay vectors, gen types+MSW
make e2e                  # Playwright journeys against local stack
make seed-realistic | seed-stress | seed-verify
make load SCENARIO=<name> | chaos SCENARIO=<name>
make docs-check           # validate docs pack, PROGRESS/BUG/RELEASE formats, dead links
```
Output rule: pipe noisy commands through `| tail -n 40`; on failure re-run only the failing target (docs/11 §3).

## 4. How we work — Superpowers workflow (mandatory)
1. **brainstorming** — only if the story leaves a design decision open; otherwise write a 1-paragraph understanding citing doc sections.
2. **using-git-worktrees** — one worktree + branch per story: `feat/VCK-<id>-<slug>` in `../vck-worktrees/`.
3. **writing-plans** — save to `docs/plans/VCK-<id>.md`; tasks 2–5 min, exact files, failing test first, verification command.
4. **subagent-driven-development** (default) or **executing-plans** (small/tightly coupled).
5. **test-driven-development** — RED → GREEN → REFACTOR, always.
6. **verification-before-completion** — run commands, paste real (tailed) output before claiming done.
7. **requesting-code-review** → **receiving-code-review**.
8. **finishing-a-development-branch** — rebase, green CI, squash-merge `type(scope): summary (VCK-<id>)`.
9. **Record** — update `docs/progress/PROGRESS.md`; on slice release write RELEASE + CHANGELOG (docs/12).
Bugs: **systematic-debugging** first → open `docs/bugs/BUG-<nnn>.md` → reproduce, root cause, regression test, fix.
**dispatching-parallel-agents** only for tasks with disjoint file sets.

## 5. Parallel work rules
- Contract first: boundary changes start with a `contract/<slice>-<slug>` PR touching only `contracts/`.
- Slices ship together: backend + frontend stories on one contract, parallel worktrees, one flag `FF_<SLICE>`.
- Lanes own directories — PLAT: `contracts/ infra/ tools/ .github/ Makefile turbo.json docs/(shared)`;
  BE: `apps/backend/**` except ADM paths; ADM: `apps/backend/src/{admin,api/admin}/**` and
  `apps/backend/src/modules/{audit_log,import_job,reporting}/**`;
  PKG: `packages/**` except `packages/ui-kit/**`; WEB: `apps/storefront/**`, `packages/ui-kit/**`, `design-system/**`.
- Frontend never waits: MSW mocks generated from contracts; real API behind `NEXT_PUBLIC_API_MODE=real`.
- Migrations: BE/PKG own their module migrations; one module = one owner; reserve names in the plan.
- Integration checkpoint per slice: `make up && make e2e` with the flag on, mocks off.

## 6. Engineering rules (summary — full text docs/10)
1. Money is **integer VND** everywhere (ADR-008). VNPay amount = VND × 100 only inside the VNPay adapter.
2. Payment outcome comes **only from IPN / provider query**, never from the browser return (ADR-007).
3. Every webhook/IPN handler is **idempotent** (dedupe key stored, unique index) and verifies signature/token first.
4. Business logic lives in **workflows + steps with compensation**; API routes only validate, call a workflow, map result.
5. Custom data lives in **custom modules**; cross-module relations via **module links**, never FK into core tables.
6. Plugins in `packages/` MUST NOT import from `apps/`; config by options object, validated with Zod at load.
7. No secrets, real PII, or real merchant credentials in code, fixtures, logs, or seed data.
8. Timeouts on every outbound call (default 5 s, carriers 3 s); retries only for idempotent ops, backoff + jitter, cap 3.
9. Structured logs with `trace_id`; never log full provider payloads, tokens, phone numbers or addresses unmasked.
10. TypeScript `strict`; no `any`; Zod at every trust boundary; named exports; files ≤ 300 lines.
11. Server Components by default in storefront; client components small and leaf-level.
12. Tests reference AC ids: `it("... [VCK-203-AC2]")`; no test depends on another test's state.
13. PR ≤ 400 changed lines (generated excluded), one story per PR, docs updated in the same PR.

## 7. Definition of Done
- [ ] Every AC proven by a named test; tests fail without the change
- [ ] `make lint typecheck test contracts` green (tailed output in PR)
- [ ] Logs/metrics/traces added for new I/O; no sensitive data logged
- [ ] Docs updated in the same PR (contracts, 05 data model, ADR if hard to reverse)
- [ ] `docs/progress/PROGRESS.md` updated; BUG files closed with regression test id
- [ ] UI stories: design QA gate in `docs/13` §6 passed
- [ ] Slice: partner story merged, integration checkpoint passed, RELEASE note drafted (docs/12)

## 8. Domain glossary (use these names in code)
Cart · Order · Product · Variant · SKU · Region (`reg_vn`) · SalesChannel · PublishableKey · Province (tỉnh/thành) ·
Ward (xã/phường) · LegacyAddress (3-tier) · Shipment · Carrier · TrackingCode · COD · PaymentSession ·
TxnRef (our VNPay ref) · IPN · Reconciliation · Mismatch · TransferMemo (VietQR) · Review · Wishlist · AuditLog ·
Flag (`FF_*`) · Slice · Lane.

## 9. Things Claude must not do
- Edit `contracts/` in a feature branch; edit another lane's directories; edit generated code (`**/generated/**`).
- Add dependencies without noting them in the plan and the PR ("New dependency: name@version — why").
- Weaken, skip, or delete tests/gates to get green; mark tests `.skip` without a BUG id.
- Complete an order from the VNPay return URL; trust any webhook before verifying it.
- Use real personal data, real merchant keys, or production endpoints outside `infra/` secrets.
- Regenerate the design system (`--persist --force`) or paste generator output unreviewed (ADR-013).
- Read `node_modules/`, `.medusa/`, `.next/`, `dist/`, seed dumps, or lockfiles into context (docs/11 §2).
