# PROGRESS
Source of truth for status between sessions. Format: docs/12 §2. Keep "Now" ≤ 15 lines.

## Now
- Sprint: 0 — Repo, infra, CI, contracts, skeletons (docs/07 §3)
- Goal: `make up && make dev` shows empty storefront and admin; contracts pipeline green
- In progress: —
- Next: VCK-004 ∥ VCK-008 ∥ VCK-009, then VCK-005
- Blocked: VNPay sandbox registration pending (R-02)
- Open rulings: Node 20 LTS is EOL (2026-04-30) — decide ADR to move to Node 22 (would re-allow pnpm 11); CI checks are advisory: no branch protection on private free plan (R-003-16)
- Review queue: PR #2 (VCK-003)

## Checkpoints
| Slice | Date | Result | Evidence |
| --- | --- | --- | --- |

## Log
<!-- newest first; one entry per merged story (docs/12 §2) -->
### 2026-09-30 · VCK-003 CI pipeline · PLAT · PR #2 open (feat/VCK-003-ci-pipeline)
- AC: 1–3 proven by scripts/ci.test.mjs, check-scripts.test.mjs, check-pins.test.mjs + real GitHub run of PR #2 (checks 46 s, integration 1m5s, security 22 s, pins 20 s, pr-title 7–11 s; title mutation `wip:` failed as expected); AC4 open
- Decisions: plan docs/plans/VCK-003.md; R-003-1..16 (two workflow files, pinned gitleaks + narrow allowlist, pins verification, ubuntu-24.04, advisory checks)
- Bugs: none
- Follow-ups: (a) AC4: after PR #11 record max/median CI wall clock via `gh run list -w ci -L 10 --json databaseId,createdAt,updatedAt` (job summaries miss queueing), close AC4; (b) branch protection unavailable on private free plan (user: Pro or public); CODEOWNERS for .github/, scripts/check-*, .gitleaks.toml, scripts/licence-exceptions.json once it exists; (c) OSV + Renovate story (PLAT); (d) gitleaks `detect` → `git` at next bump; (e) VCK-004 workflow must: permissions exactly contents: read, timeouts, per-PR concurrency with a DISTINCT group prefix, SHA+version-comment pins, fetch-depth 0 for origin/main, no `paths:` filter if required, unique job ids, tools as devDependencies (licence gate), oasdiff as pinned binary + sha256; (f) skip `make up` at step level when `test:integration` resolves to 0 tasks if minutes get tight; (g) repo setting `sha_pinning_required`
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
