# PROGRESS
Source of truth for status between sessions. Format: docs/12 §2. Keep "Now" ≤ 15 lines.

## Now
- Sprint: 0 — Repo, infra, CI, contracts, skeletons (docs/07 §3)
- Goal: `make up && make dev` shows empty storefront and admin; contracts pipeline green
- In progress: —
- Next: VCK-003 ∥ VCK-004 ∥ VCK-008 ∥ VCK-009 (design system), then VCK-005
- Blocked: VNPay sandbox registration pending (R-02)
- Open rulings: Node 20 LTS is EOL (2026-04-30) — decide ADR to move to Node 22 (would re-allow pnpm 11)
- Review queue: PR feat/VCK-002-local-infrastructure → main

## Checkpoints
| Slice | Date | Result | Evidence |
| --- | --- | --- | --- |

## Log
<!-- newest first; one entry per merged story (docs/12 §2) -->
### 2026-09-30 · VCK-002 Local infrastructure · PLAT · PR open (feat/VCK-002-local-infrastructure)
- AC: 1–4 proven by scripts/infra.test.mjs, infra-env.test.mjs (36 tests); live `make up` 8/8 healthy ≈ 12 s warm, `make down [v=1]` verified on Docker 29.4 / arm64
- Decisions: plan docs/plans/VCK-002.md; R-002-1 MinIO 9002/9003, Mailpit 1025/8025; MinIO = community fork pgsty/minio (tag+digest, dev only; minio/minio gone from Hub); minio-init long-running because `up --wait` fails on exited one-shot; root `.env` read via `--env-file`
- Bugs: none
- Follow-ups: VCK-005 plan flags lane crossing (server+worker compose edits infra/, PLAT), bucket `vck-media` is private → public read + `S3_FILE_URL`; VCK-106 Meilisearch bump breaks old volumes; VCK-003 CI should run `make up`, not copy image tags; sims/scripts not linted (scripts/** ignored)
### 2026-09-30 · VCK-001 Monorepo scaffold · PLAT · merged 0b946f9 (local squash, no remote yet)
- AC: 1–4 proven by scripts/scaffold.test.mjs, lint-rules.test.mjs, repo-policy.test.mjs (17 tests); AC1 also run on clean clone, Node 20.20.2 and 24.15.0
- Decisions: plan docs/plans/VCK-001.md; R-001-1..5 (stubs in other lanes, pnpm@10.34.6 for Node 20, typescript pinned 6.0.3 for typescript-eslint, turbo globalDependencies, deny-list enumerated)
- Bugs: none
- Follow-ups: VCK-003 CI must run lint, typecheck and `node --test scripts/*.test.mjs`; VCK-005/006 need tsconfig include for root *.config.ts, `types:["node"]`, pnpm `onlyBuiltDependencies`; add scripts/ to CLAUDE.md §1/§5 (user)

## Retro notes
<!-- per sprint: metrics (docs/07 §10) + one improvement -->
