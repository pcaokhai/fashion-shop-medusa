# PROGRESS
Source of truth for status between sessions. Format: docs/12 §2. Keep "Now" ≤ 15 lines.

## Now
- Sprint: 0 — Repo, infra, CI, contracts, skeletons (docs/07 §3)
- Goal: `make up && make dev` shows empty storefront and admin; contracts pipeline green
- In progress: VCK-008 PR-B (make release) awaiting review
- Next: VCK-009 B2, C1, C2 → VCK-006
- Blocked: VNPay sandbox registration pending (R-02)
- Open rulings: Node 20 LTS is EOL (2026-04-30) — decide ADR to move to Node 22 (would re-allow pnpm 11); CI checks are advisory: no branch protection on private free plan (R-003-16)
- Review queue: VCK-008 PR-B

## Checkpoints
| Slice | Date | Result | Evidence |
| --- | --- | --- | --- |

## Log
<!-- newest first; one entry per merged story (docs/12 §2) -->
### 2026-10-02 · VCK-008 (PR-B of 2) make release · PLAT · PR open (feat/VCK-008-make-release)
- AC: AC2 proven by tools/docs tests (201) and scripts/docs-ci.test.mjs (no workflow runs `make release`; usage guard); dry run on `--no-hardlinks` clones of the real repo
- Decisions: R-008-12..21 (draft meant to fail docs-check until edited; no `--force`; atomic three-file write; CLAUDE.md not edited). Size exception R-008-20: ≈575 changed lines over the 400 guideline, one cohesive CLI, splitting would leave a dead half
- Dependencies: none
- Bugs: none
- Follow-ups: hostile findings fixed in review (NUL-delimited log, wx guard, symlink/mode/date); `--no-show-signature` untested; gpg-signed-commit not exercised; version ordering vs last tag unchecked; `.changeset/` consumption manual; CLAUDE.md §3 comment wording (user item)
### 2026-10-02 · VCK-009 (PR B1 of 4) lint + token hardening · WEB · PR open (feat/VCK-009-design-system-b)
- AC: AC2 second half proven: storefront lint rule `vck/no-raw-values` fails raw hex/colour functions and px values (apps/storefront/eslint/*, 137 tests, mutation-proven, severity guard) + `check-css.mjs`; tokens.css is `@theme static` with nine `--text-*--line-height` companions, proven by a real Tailwind 4.3.3 compile test (ui-kit 60 tests)
- Decisions: plan docs/plans/VCK-009.md R-009-6, R-009-7, R-009-15 (4 PRs: B1 lint+tokens, B2 Next scaffold+font+licence exceptions, C1 motion, C2 /_design), R-009-16 (owner decision: keep sharp, per-package LGPL exceptions in B2)
- Dependencies: vitest@4.1.11 (storefront tests); tailwindcss@4.3.3, @tailwindcss/postcss@4.3.3, postcss@8.5.23 (theme compile test), all MIT; dev-only transitive lightningcss is MPL-2.0 (CI licence gate covers --prod only, stays green)
- Bugs: none
- Follow-ups: B2, C1, C2; decide whether the licence gate should also cover dev dependencies (all-deps check currently fails on argparse Python-2.0, Unlicense deps, lightningcss MPL-2.0)
### 2026-10-02 · VCK-009 (PR A of 3) skill + tokens · WEB · PR open (feat/VCK-009-design-system)
- AC: AC1 (skill 2.15.0 vendored, hash pin in ADR-013, smoke + import checks in scripts/ui-skill.test.mjs) and AC2 first half (tokens.css + drift tests: 66 MASTER/docs13 tokens, 37 DERIVED, contrast table) proven
- Decisions: plan docs/plans/VCK-009.md; R-009-1..13
- Dependencies: vitest@4.1.11, @types/node@20.19.43
- Bugs: none
- Follow-ups: `docs:` PR to MASTER (name the 37 DERIVED tokens; muted-foreground 7.6:1 is on card, 7.30 on background; rating/card 2.15:1 exemption); PR B (lint + Next scaffold + font + `@theme static` check + `--text-*--line-height`; record `onlyBuiltDependencies`); PR C (motion + /_design); `tsconfig.test.json` alternative to `"types": ["node"]`; Python 3.12.13 passed search.py and the import check locally (reviewer-verified), CI first run confirms; ADR-013 licence conflict (package.json MIT vs README CC-BY-NC-4.0) to confirm; root `eslint .` reports 2 pre-existing errors in tools/sims/vnpay/server.mjs (`process` not defined), PLAT follow-up
### 2026-10-02 · VCK-008 (PR-A of 2) docs-check · PLAT · merged edc1151 (PR #6)
- AC: 1, 3 and the RELEASE/required-file/index checks proven by tools/docs tests (17 hostile.test.mjs tests plus round2/round3, release-doc); AC4 (PR template + CI step) by scripts/docs-ci.test.mjs; CI `checks` job runs `node tools/docs/check-cli.mjs`
- Decisions: plan docs/plans/VCK-008.md; R-008-1..11 (no new dependency, Node stdlib; check-cli.mjs is the only entry, no main-module heuristic; fence- and comment-aware parsing)
- Bugs: none
- Follow-ups: PR-B `make release` (index row shape `| x.y.z | <date> | <highlights, no '|'> | RELEASE-x.y.z.md |`; a draft copied from the template fails docs-check until its sections are filled); CLAUDE.md §3 comment still lists dead links/RELEASE formats (user's file, not edited); deferred checks: dead links, story-id existence, ADR link resolution, YAML/JSON parse; bug index link target is not checked (text only); leading-zero version names rejected now (strict semver); symlinked records outside VCK_ROOT are followed (reads only); `\|` escaped pipes in index rows unsupported
### 2026-10-01 · VCK-004 Contracts pipeline · PLAT · PR #4 open (feat/VCK-004-contracts-pipeline, stacked on PR #3)
- AC: 1–4 proven by tools/contracts tests (166+ incl. real oasdiff), scripts/ci.test.mjs and real GitHub runs on PR #4 (spec 24 s, generated 29 s with ubuntu/Node 20 output byte-identical to the macOS commit, breaking 21 s; security fixed after gitleaks flagged the fake token inlined in generated handlers); scratch PR #5 (closed): removing /health/ready made `breaking` FAIL ("requires the label 'contract-breaking'") and `generated` FAIL (drift), `spec` pass
- Decisions: plan docs/plans/VCK-004.md; R-004-1..14 (merge #3 before #4; accepted orval-7 gaps; `make contracts` vs `make contracts-check`; narrow gitleaks allowlist; size exception; contract PRs regenerate output)
- Bugs: none
- Follow-ups: VCK-005 preconditions: (i) generated validators do NOT enforce integer VND (ADR-008): do not rely on them for money until the Node 22 ADR / orval 8 or an integer post-step; (ii) zod alignment: Medusa 2.14–2.21.2 pins zod 4.2.0 exactly (`@medusajs/framework/zod`), backend has zod ^4.6.5 so a SECOND copy: pin Medusa >= 2.14 and align zod or import from `@medusajs/framework/zod`, plus a test that a generated schema error becomes a 400 through Medusa; (iii) pnpm `onlyBuiltDependencies` (msw, esbuild, @scarf/scarf); (iv) 202 response validator gap (requestGuestCancelOtp). VCK-006 consumes `gen:api`/`msw-handlers.ts` (agents read the spec/fixtures, not generated/). Node 22 ADR (unblocks msw 3, orval 8, pnpm 11; Node 20 EOL 2026-04-30). PLAT: `push: main` trigger for contracts.yml once branch protection exists; split scripts/ci.test.mjs (294/300 lines); delete unused `--check/--out` CLI surface and `gen:storefront`/`gen:backend` if still unused; docs PR for docs/04 §6 + CLAUDE.md §5/§9 (contract PRs regenerate output; agents do not read generated/); merge order #3 before #4 (rebase)
### 2026-09-30 · VCK-003 CI pipeline · PLAT · merged b028a65 (PR #2)
- AC: 1–3 proven by scripts/ci.test.mjs, check-scripts.test.mjs, check-pins.test.mjs + real GitHub run of PR #2 (checks 46 s, integration 1m5s, security 22 s, pins 20 s, pr-title 7–11 s; title mutation `wip:` failed as expected); AC4 open
- Decisions: plan docs/plans/VCK-003.md; R-003-1..16 (two workflow files, pinned gitleaks + narrow allowlist, pins verification, ubuntu-24.04, advisory checks)
- Bugs: none
- Follow-ups: (a) AC4: after PR #11 record max/median CI wall clock via `gh run list -w ci -L 10 --json databaseId,createdAt,updatedAt` (job summaries miss queueing), close AC4; (b) branch protection unavailable on private free plan (user: Pro or public); CODEOWNERS for .github/, scripts/check-*, .gitleaks.toml, scripts/licence-exceptions.json once it exists; (c) OSV + Renovate story (PLAT); (d) gitleaks `detect` → `git` at next bump; (e) VCK-004 workflow must: permissions exactly contents: read, timeouts, per-PR concurrency with a DISTINCT group prefix, SHA+version-comment pins, fetch-depth 0 for origin/main, no `paths:` filter if required, unique job ids, tools as devDependencies (licence gate), oasdiff as pinned binary + sha256; (f) skip `make up` at step level when `test:integration` resolves to 0 tasks if minutes get tight; (g) repo setting `sha_pinning_required`
### 2026-09-30 · VCK-002 Local infrastructure · PLAT · merged 204a204 (PR #1)
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
