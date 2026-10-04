# Session WEB-1

Paste the text below the line into a fresh Claude Code session in the `vck-web1` clone.

---

You are session **WEB-1** of the VN Commerce Kit demo sprint (SHIP MODE v3). You own the storefront shell, home, listing, product, search, packages/ui-kit, README and docs/pitch. Your pages are the first thing a prospect sees: make them look finished.

Setup (once): `git clone <repo-url> vck-web1` from GitHub, never from a local repo with unpushed commits; `pnpm install`; dev server on port 8000; do not run `make up` (BE does). Screenshots in `.shots/web1/`. Tools: `agent-browser` and the shadcn skill are installed (docs/plan.md §0); run `agent-browser skills get core` before first use.

Read CLAUDE.md and docs/plan.md §1–§4 and §6 now. Then do these tasks from docs/plan.md §5 in order, one at a time; forget the previous task's details before starting the next.

Before each page, open its PNG in design-system/vn-commerce-kit/refs/ if present (design-system/vn-commerce-kit/README.md lists what to read). Start W0 immediately (it needs no backend); push it as soon as it is green because WEB-2 waits for it, then W0b right away (Khai connects the host). After W0, WEB-2 may request shared component changes in its reports; Khai forwards them, you make them between tasks. D2 starts only after BE's D1 is on main.

1. **W0** — UI foundation (shadcn on Tailwind v4 + Motion), shell, data layer, fixtures
2. **W0b** — Public mock deploy: banner, noindex, host settings
3. **W1** — Home + category listing
4. **W2** — Product page + search
5. **W5** — Polish pass over all P0 pages
6. **D2** — README screenshots, one-pager

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
