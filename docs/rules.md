# Rules
Numbered so a commit can cite them. Add a rule when a decision is made; never delete, mark superseded.

## 1. Strict (never bend)
1. Money is integer VND end to end (database, API, UI). VNPay's ×100 happens only inside the VNPay adapter and is covered by golden vectors.
2. Payment truth comes only from a verified IPN or a provider query (querydr). The browser return URL is display only.
3. Every webhook/IPN: verify signature → dedupe (unique index on provider + transaction id) → process in a workflow. Retries from the provider are safe.
4. Business logic in workflows with compensation; API routes validate with Zod, call a workflow, map the result.
5. Custom data in custom modules joined by module links, never a foreign key into Medusa core tables.
6. No secrets, real PII or merchant keys in code, fixtures, seed or logs; phone and address masked in logs; trace id on every log line.
7. Timeouts on all outbound calls (5 s, carriers 3 s); retries only for idempotent calls, max 3 with jitter.

## 2. Product decisions (demo)
8. Guest checkout is the default; accounts are optional and light.
9. Shipping in the demo is a flat rate per region; live GHN fees are fast-follow.
10. VN address is 2-tier (province, ward); legacy 3-tier mapping is fast-follow.
11. Order lookup by code + phone is fast-follow (F2).
12. Oversell: inventory is reserved at checkout and released on failed payment or after a 30-minute hold.
13. Reconciliation (querydr) and refunds are fast-follow (F1) and mandatory before production (plan §9).
14. Emails go to Mailpit in the demo; a real provider is a production task.
15. The storefront language is Vietnamese; English is not in scope for the demo.

## 3. Engineering (lean)
16. TypeScript strict, no `any`, Zod at trust boundaries, named exports, files ≤ 300 lines, exact dependency versions (`save-exact=true`).
17. UI is assembled from shadcn/ui, Motion and Lucide, themed from MASTER tokens; no hand-built primitives, no second animation library; Server Components by default.
18. Tests exist only where docs/plan.md §6 lists them; UI is verified by typecheck, lint, build and the agent-browser QA loop; client validation is required fields + phone only.
19. Generated code (`**/generated/**`) is never edited or read; regenerate with `make contracts`.
20. One commit per task, box ticked in the same commit; no PRs, no worktrees, no flags for new work.

## 4. Public demo
21. Any public non-production deployment shows the demo banner and is `noindex` (meta + robots) until it is the real store.
22. Medusa Store API fixtures live in `contracts/fixtures/medusa/`, typed from `@medusajs/types`; `make record-fixtures` output replaces hand-written ones.
23. Each lane works in its own clone from GitHub, with its own port and `.shots/<lane>/` directory; only the BE clone runs `make up`.
24. Product photos come only from sources whose licence allows commercial use; sources and licences are recorded in `tools/seed/ASSETS.md`.

## 5. Open questions (default applies until answered)
- Q1 Address dataset source and licence → default: provinces + wards from the official open list, name it in the commit.
- Q2 Demo reset cadence → default: nightly at 03:00 Asia/Ho_Chi_Minh.
