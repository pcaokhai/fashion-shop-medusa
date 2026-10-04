# Session WEB-2

Paste the text below the line into a fresh Claude Code session in the `vck-web2` clone.

---

You are session **WEB-2** of the VN Commerce Kit demo sprint (SHIP MODE v3). You own cart, checkout, VNPay return, order confirmation and account lite. Checkout is where a prospect judges whether this is a real shop: make it fast, clear and polished.

Setup (once): `git clone <repo-url> vck-web2` from GitHub, never from a local repo with unpushed commits; `pnpm install`; dev server on port 8001 so you do not collide with WEB-1; do not run `make up` (BE does; in real mode your pages call `localhost:9000`). Screenshots in `.shots/web2/`. Run `agent-browser skills get core` before first use.

Read CLAUDE.md and docs/plan.md §1–§4 and §6 now. Then do these tasks from docs/plan.md §5 in order, one at a time; forget the previous task's details before starting the next.

Before W3 open design-system/vn-commerce-kit/refs/checkout-*.png if present. Before W3: `git pull --rebase` until W0 from WEB-1 is on main. Reuse its data layer, shadcn components and theme; do not edit the shell; request changes in your report. The VNPay return page must never mark an order paid: it polls the order until the backend says paid. W4 starts only after Gate 1.

1. **W3** — Cart Sheet + checkout + VNPay return + confirmation + 2 Playwright journeys
2. **W4** — Account lite + branded 404 (after Gate 1)

Rules for this session:
- This clone is yours alone. Before each task `git pull --rebase`; after it one commit `type(scope): summary (<task id>)` that also ticks the box in docs/plan.md, then `git pull --rebase && git push`. On a conflict in a file another lane owns, keep their version and redo your part.
- Read CLAUDE.md, your app's CLAUDE.md and your task in docs/plan.md §5; read docs/rules.md only for the rules the task names; never read docs/archive/, generated code or lockfiles.
- Tests are only the ones docs/plan.md §6 lists; everything else is typecheck, lint, build and the UI QA loop in CLAUDE.md §2.4.
- Pipe noisy output through `| tail -n 30`. Report in 6 lines max: what changed, what you ran with real output, what Khai must check by hand, pages checked.
- Blocked more than 15 minutes: write the blocker in the report, leave the box unticked, take the next task that does not depend on it.
- Continue with the next task without waiting unless the task says Khai must review first.

UI rules:
- Assemble pages from shadcn/ui components, Motion and Lucide, themed from the MASTER tokens; customise through the theme and variants; no hand-built primitives, no GSAP.
- Use the mock data layer first (`NEXT_PUBLIC_API_MODE=mock`); switch a page to real mode when the matching BE task is on main and keep mock working.
- Quality over quantity: P0 pages must look finished at 375 and 1440 px (spacing, typography, imagery, skeletons, empty/error states, motion). Compare with pages/<page>.md and MASTER.md in the QA loop.
- Client validation: required fields + phone format only. `pnpm typecheck`, `pnpm lint`, `pnpm build` green before each commit.

When the list is done, run the full verification for your lane once more and report the result.
