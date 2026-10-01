# PROGRESS
Source of truth for status between sessions. Format: docs/12 §2. Keep "Now" ≤ 15 lines.

## Now
- Sprint: 0 — Repo, infra, CI, contracts, skeletons (docs/07 §3)
- Goal: `make up && make dev` shows empty storefront and admin; contracts pipeline green
- In progress: none (VCK-009 and VCK-008 merged)
- Next: VCK-005 (Medusa backend skeleton; preconditions in follow-ups) → VCK-006
- Blocked: VNPay sandbox registration pending (R-02)
- Open rulings: Node 20 LTS is EOL (2026-04-30) — decide ADR to move to Node 22 (would re-allow pnpm 11); CI checks are advisory: no branch protection on private free plan (R-003-16); motion budget: a route using Reveal costs ≈35–38 KB gz vs 25 KB in docs/13 §4.5 — re-scope or use CSS reveals (R-009-24)
- Review queue: none

## Checkpoints
| Slice | Date | Result | Evidence |
| --- | --- | --- | --- |

## Log
<!-- newest first; one entry per merged story (docs/12 §2) -->
### 2026-10-02 · VCK-009 (PR C2 of 4) /_design review route · WEB · merged 73baf7c (PR #12)
- AC: AC5 proven by src/app/design-gate.test.ts (`isDesignRouteEnabled` true for development/test, false for production/undefined/staging; page calls `notFound()` when disabled), mutation-proven (production enabled, notFound removed); AC3 visual: e2e/design.spec.ts after `document.fonts.ready` Be Vietnam Pro face loaded, unicodeRange has 1EA0, `document.fonts.check` true for the Vietnamese sample (real Google Fonts, network). Local Playwright (dev, reduced, prod projects): 10 passed in the final run on Node 24 (swatch count = tokens.css `--color-*` count, type/Button/Badge/Chip/motion specimens, Tab ring colour, reduced-motion samples `data-motion="reduced"` and no transform, production `/_design` 404, screenshots 375/768/1440 without horizontal overflow)
- Decisions: R-009-25 (folder `%5Fdesign`: a plain `_design` is a Next private folder; real URL `/_design` tested); `/_design` is `page.dev.tsx`, present only under `next dev` (phase-based `pageExtensions`; production build has no route, chunk or manifest entry; `NODE_ENV=test` build/start and ISR revalidation all 404); script bytes (gzip -9) first-load JS = scripts in the built HTML incl. noModule polyfills: `/` 168.9 KB (<= 170), `/_design` 203.9 KB (scratch build with the route enabled; about +35 KB for Reveal, R-009-24, over the 25 KB budget); bytes Chrome downloads (e2e, cap 145 KB): `/` 130.6 KB, `/_design` 165.8 KB; Button/Badge/Chip are route-local token-styled specimens (no ui-kit API invented); `agentRules: false` in next.config.mjs stops `next dev` editing apps/storefront/CLAUDE.md (guard test in scripts/web-config.test.mjs)
- Dependencies: @playwright/test@1.63.0 (Apache-2.0, storefront dev only; prod licence gate green); e2e is local-only, no CI job
- Bugs: none
- DoD docs/13 §6: [x] tokens only, lint green; [x] reduced-motion variant verified; [ ] MASTER §6 / axe 0 serious and keyboard path (only Tab ring covered); [~] screenshots 375/768/1440 attached to PR (screen recording pending); [ ] Lighthouse mobile and CI bundle budgets (no CI job)
- Follow-ups: owner budget decision R-009-24 (re-scope 25 KB Motion budget or use §4.6 CSS reveal); reduced-motion toggle UI and persistence (VCK-006); Stagger `as` prop; axe run and screen recording; e2e into CI later
### 2026-10-02 · VCK-009 (PR C1 of 4) motion tokens + primitives · WEB · merged d0e533a (PR #11)
- AC: AC4 proven by ui-kit motion.test.ts (motion.ts = docs/13 §4.2 table = tokens.css `--dur-*`/`--ease-*`; changed docs/ts values and a missing row fail) and motion/motion.test.tsx + motion.ssr.test.tsx (OS x toggle matrix, reduced = opacity only <=100 ms, delay 0, `data-motion`; below-fold Reveal starts {opacity 0, y 16} with expressive/enter; in-viewport at mount not animated; Stagger 0..350 then 0 from the 9th; SSR markup has no inline opacity/transform; real `LazyMotion strict` accepts `m`); mutation-proven (token edit, forced-full, always-armed, reduced keeps y, stagger max, SSR hidden)
- Decisions: R-009-9 (`LazyMotion domAnimation strict` + `m`, now inside `Reveal`, R-009-24; ESLint bans the `motion` namespace); Reveal arms after mount and only below the fold (SSR and LCP stay visible; armed state is remounted on a reduced flip, `key`); `transpilePackages: ["@vck/ui-kit"]` in next.config.mjs (ui-kit exports TS source); Stagger wraps each child in a `div` (Reveal)
- Dependencies: motion@13.4.6 (MIT, no engines field; storefront prod + ui-kit dev); ui-kit dev: react, react-dom 19.3.0, jsdom@27.4.0 (^20.19), @testing-library/react@16.3.3, @testing-library/dom@10.4.2, @types/react(-dom)@19.3.0; prod licence gate green
- Bugs: none
- Follow-ups: R-009-24 (measured): `/` first-load JS 206.5 -> 168.9 KB gz (baseline 168.7) after ui-kit `sideEffects: ["*.css"]`, context-only `MotionProvider` and `LazyMotion` inside `Reveal`; async `domAnimation` is NOT the fix (+4 KB once `m` is in the graph). A route that renders Reveal/Stagger pays about 38 KB gz, over the 25 KB budget (docs/13 §4.5): owner decides in a `docs:` PR whether to re-scope it or use the §4.6 CSS reveal layer (`sr-up`); C2 measures `/_design`; footer reduced-motion toggle UI and persistence, and `.rm`/`data-reduced-motion` on `<html>` for CSS (VCK-006); a Stagger `as` prop when the first `ul > li` consumer appears (use `staggerDelay(i)` on real items until then)
### 2026-10-02 · VCK-009 (PR B2 of 4) Next scaffold + font + licence exceptions · WEB · merged a639546 (PR #10)
- AC: AC3 proven by src/app/fonts.test.ts (weights 400-700, vietnamese+latin, swap, `--font-be-vietnam-pro`, `--font-sans` starts with Be Vietnam Pro, `lang="vi"`, unicode-range covers the sample string and rejects 漢) and AC2 by globals.test.ts (tailwind then tokens import, 2px `--color-ring` focus ring, reduced-motion block, no raw values); both mutation-proven. Build smoke green: `next build` (Turbopack, network) and offline `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=$PWD/apps/storefront/test/font-mock.cjs next build --webpack`
- Decisions: R-009-4, R-009-16 (owner decision: LGPL/CC-BY licence exceptions kept per package), R-009-17..22; typecheck = `next typegen && tsc`, next-env.d.ts gitignored; Turbopack ignores the font mock for woff2 files so the offline smoke uses `--webpack`; no `onlyBuiltDependencies` change (build needs none)
- Dependencies: next@16.3.8, react@19.3.0, react-dom@19.3.0, tailwindcss@4.3.3, @tailwindcss/postcss@4.3.3, @types/react@19.3.0, @types/react-dom@19.3.0, @types/node@20.19.43 (storefront dev)
- Bugs: none
- Follow-ups: `docs:` PR to MASTER; e2e in CI later; VCK-006 handoff (replace `page.tsx`, tokens-only utilities, sharp kept (owner decision R-009-16); add THIRD-PARTY-NOTICES / client-delivery LGPL notice per R-009-16)
### 2026-10-02 · VCK-008 (PR-B of 2) make release · PLAT · merged abc26b6 (PR #9)
- AC: AC2 proven by the PR-B share of the tools/docs suite (205 total incl. PR-A's) and scripts/docs-ci.test.mjs (no workflow runs `make release`; usage guard); dry run on `--no-hardlinks` clones of the real repo
- Decisions: R-008-12..21 (draft meant to fail docs-check until edited; no `--force`; atomic three-file write; CLAUDE.md not edited). Size exception R-008-20: ≈1700 changed lines (≈545 code, ≈1070 test, ≈87 docs) over the 400 guideline, one cohesive CLI, splitting would leave a dead half
- Dependencies: none
- Bugs: none
- Follow-ups: hostile findings fixed in review (NUL-delimited log, wx guard, symlink/mode/date); `--no-show-signature` untested; gpg-signed-commit not exercised (ordering and untagged-previous-release now refused); `.changeset/` consumption manual; CLAUDE.md §3 comment wording (user item)
### 2026-10-02 · VCK-009 (PR B1 of 4) lint + token hardening · WEB · merged 0346568 (PR #8)
- AC: AC2 second half proven: storefront lint rule `vck/no-raw-values` fails raw hex/colour functions and px values (apps/storefront/eslint/*, 137 tests, mutation-proven, severity guard) + `check-css.mjs`; tokens.css is `@theme static` with nine `--text-*--line-height` companions, proven by a real Tailwind 4.3.3 compile test (ui-kit 60 tests)
- Decisions: plan docs/plans/VCK-009.md R-009-6, R-009-7, R-009-15 (4 PRs: B1 lint+tokens, B2 Next scaffold+font+licence exceptions, C1 motion, C2 /_design), R-009-16 (owner decision: keep sharp, per-package LGPL exceptions in B2)
- Dependencies: vitest@4.1.11 (storefront tests); tailwindcss@4.3.3, @tailwindcss/postcss@4.3.3, postcss@8.5.23 (theme compile test), all MIT; dev-only transitive lightningcss is MPL-2.0 (CI licence gate covers --prod only, stays green)
- Bugs: none
- Follow-ups: B2, C1, C2; decide whether the licence gate should also cover dev dependencies (all-deps check currently fails on argparse Python-2.0, Unlicense deps, lightningcss MPL-2.0)
### 2026-10-02 · VCK-009 (PR A of 3) skill + tokens · WEB · merged 95b953a (PR #7)
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
