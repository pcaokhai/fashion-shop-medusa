# CLAUDE.md — VN Commerce Kit (SHIP MODE v3.1)

Vietnamese e-commerce store for an SME (~900 products): Medusa v2 backend + stock admin, Next.js storefront, and the
reusable VN pieces (VNPay, VN addresses, accent-insensitive search). Goal: a public demo a client can click through end
to end (browse → search → cart → checkout COD or VNPay sandbox) that **looks finished**: the storefront is what a
prospect sees first, so UI quality comes before secondary flows. One person (Khai) plus parallel Claude Code sessions;
Khai reads diffs only for money, payment truth and private data. Keep this file short; read only what your task needs.

## 1. Repository map
```
apps/backend/      Medusa v2 server + worker, modules, workflows, API routes, VNPay provider   lane BE
apps/storefront/   Next.js App Router: Tailwind v4 + shadcn/ui + Motion; data layer real|mock   lanes WEB-1, WEB-2
packages/ui-kit/   Design tokens only (mapped into the shadcn theme); no hand-built primitives   lane WEB-1
tools/seed, sims   Seed engine + images, VNPay/GHN simulators                                   lane BE
contracts/         openapi.yaml (custom routes), fixtures (+ fixtures/medusa), VNPay golden vectors
design-system/     MASTER.md + pages/*.md: the look of each page                                read by WEB lanes
docs/plan.md       THE plan and THE tracker (checkboxes)     docs/rules.md  numbered rules     docs/archive/  never read
```

## 2. Workflow (no exceptions)
1. Each session has its own clone **from GitHub** (never from a local repo with unpushed commits). `git pull --rebase`
   before a task; one commit per task `type(scope): summary (<task id>)`, box ticked in docs/plan.md in the same
   commit; `git pull --rebase && git push`.
2. Read: this file, your app's CLAUDE.md, your task in docs/plan.md §5, the rules it names. Nothing else. Never read
   `**/generated/**`, lockfiles, `node_modules/`, `.next/`, `.medusa/`, seed dumps, docs/archive/, docs/adr/.
3. Tests only where docs/plan.md §6 lists them (money, payment truth, oversell, two Playwright journeys). Everything
   else: `pnpm typecheck`, `pnpm lint`, build, and the UI QA loop below.
4. **UI QA loop** (every UI task, max 2 rounds; first open `design-system/vn-commerce-kit/refs/<page>-*.png` if present):
   run the dev server; with `agent-browser` open the page, capture 375 px
   and 1440 px screenshots and `snapshot -i`; compare with `design-system/vn-commerce-kit/pages/<page>.md` and MASTER.md;
   fix visible defects (alignment, overflow, missing states, contrast, jerky motion); then report. At each gate run the
   `agent-browser` dogfood workflow over the whole journey and fix P0 defects. Playwright is for `make e2e` only.
5. Pipe noisy output through `| tail -n 30`. Report in 6 lines: what changed, what you ran (real output), what Khai
   must check by hand, pages checked.
6. Blocked more than 15 minutes: write it in the report, leave the box unticked, take the next independent task.
7. No PRs, worktrees, feature flags, ADRs, PROGRESS/BUG/RELEASE files, docs tooling, or planning tools for specified tasks.
8. Ports: backend 9000, WEB-1 8000, WEB-2 8001. Only the BE clone runs `make up`; WEB lanes in real mode call
   `localhost:9000`. Screenshots go to `.shots/<lane>/` inside your own clone (gitignored), never /tmp.

## 3. Commands
```
make up | down          postgres, redis, meilisearch, minio, mailpit, vnpay-sim, ghn-sim
pnpm dev                backend server + worker + storefront (turbo)
pnpm typecheck | lint | test | build
make contracts          spectral, oasdiff, schema compile, VNPay vectors, generate types
make seed | record-fixtures   seed (B1a mini 60 products, B1b full 900) | record Medusa Store responses as fixtures
make e2e                Playwright COD + VNPay-simulator journeys;  make demo-reset  reset the public demo (D1)
agent-browser open <url> | snapshot -i | screenshot <file> | close     UI QA (see `agent-browser skills get core`)
npx medusa db:generate <module> | db:migrate | db:sync-links | exec <file> | user -e <email> | develop     Medusa CLI
```

## 4. Strict rules (never bend; full text docs/rules.md §1)
1. Money is **integer VND** everywhere; VNPay amount ×100 only inside the VNPay adapter.
2. An order is paid **only** when a verified IPN or a provider query says so; never from the browser return URL.
3. Every webhook/IPN handler verifies the signature first and is **idempotent** (dedupe key with a unique index).
4. Business logic in workflows + steps with compensation; routes validate (Zod), call a workflow, map the result.
5. Custom data in custom modules linked by module links; never a foreign key into core Medusa tables.
6. No secrets, real PII or real merchant keys in code, fixtures, logs or seed; mask phone and address in logs.
7. Every outbound call has a timeout (5 s, carriers 3 s); retries only for idempotent calls, max 3, with jitter.

## 5. Allowed shortcuts (use them; speed matters)
- UI: shadcn/ui components (Sheet, Drawer, Command, Carousel, Sonner, Combobox, Form…), Motion for animation, Lucide icons.
  Customise through the theme and variants; do not hand-build primitives or write bespoke CSS animation systems.
- Storefront data layer starts from the official Medusa Next.js starter's `lib/data` (cart, checkout, customer, orders);
  copy the data/actions, never its look. Check its licence before copying.
- Client validation: required fields + phone format only. Server validation (Zod) stays at API boundaries.
- Medusa: use its CLI for what it covers (scaffold with `create-medusa-app`, `db:generate`/`db:migrate`/`db:sync-links`, `exec` for
  seed scripts, `user` for the admin); never hand-write migrations. Stock admin, flat-rate shipping, Mailpit, simple Meilisearch.

## 6. Things Claude must not do
- Complete an order from the VNPay return URL; trust an IPN before verifying it; store money as float or string.
- Edit `contracts/openapi.yaml` in a WEB lane (ask BE in the report); edit another lane's directories.
- Add a dependency without one commit-message line ("New dependency: name@version, why"); use `^` ranges.
- Skip or delete a listed test to get green; log full provider payloads or unmasked phone numbers.
- Re-run the design-system generator; read docs/archive/; add GSAP or a second animation system.
