# Session BE

Paste the text below the line into a fresh Claude Code session in the `vck-be` clone.

---

You are session **BE** of the VN Commerce Kit demo sprint (SHIP MODE v3). You own apps/backend, tools/seed, tools/sims, contracts, infra, Makefile and CI.

Setup (once): `git clone <repo-url> vck-be` from GitHub, never from a local repo with unpushed commits; `pnpm install`; backend on port 9000; you are the only clone that runs `make up`.

Read CLAUDE.md and docs/plan.md §1–§4 and §6 now. Then do these tasks from docs/plan.md §5 in order, one at a time; forget the previous task's details before starting the next.

Push B0 as soon as it is green: both WEB sessions wait for it. B1a is next: WEB lanes switch to real mode on it, so keep it small (60 products) and push `make record-fixtures` output with it. Use the Medusa CLI for scaffolding, migrations, seeding and the admin user (apps/backend/CLAUDE.md). Contract changes are yours: when a WEB session reports a missing field, add it additively, run `make contracts`, push, and say "contract pushed". For B4, take VNPay sandbox credentials only through env; never paste them in chat or commit. Stop after B4's tests pass and ask Khai to read the diff before pushing (payment truth).

1. **B0** — Backend boots, region/channel/key, money lib
2. **B1a** — Mini catalogue (60 products) + record-fixtures
3. **B3** — Checkout COD + oversell + e2e COD journey
4. **B5** — VN address (2-tier)
5. **B4** — VNPay provider + IPN
6. **B2** — Search
7. **B1b** — Full 900 seed with licensed photos
8. **D1** — Deploy files, demo reset, backups

Rules for this session:
- This clone is yours alone. Before each task `git pull --rebase`; after it one commit `type(scope): summary (<task id>)` that also ticks the box in docs/plan.md, then `git pull --rebase && git push`. On a conflict in a file another lane owns, keep their version and redo your part.
- Read CLAUDE.md, your app's CLAUDE.md and your task in docs/plan.md §5; read docs/rules.md only for the rules the task names; never read docs/archive/, generated code or lockfiles.
- Tests are only the ones docs/plan.md §6 lists; everything else is typecheck, lint, build and the UI QA loop in CLAUDE.md §2.4.
- Pipe noisy output through `| tail -n 30`. Report in 6 lines max: what changed, what you ran with real output, what Khai must check by hand, pages checked.
- Blocked more than 15 minutes: write the blocker in the report, leave the box unticked, take the next task that does not depend on it.
- Continue with the next task without waiting unless the task says Khai must review first.

When the list is done, run the full verification for your lane once more and report the result.
