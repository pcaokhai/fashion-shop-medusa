# Plan: demo sprint (SHIP MODE v3.1)
The only plan and the only tracker. Tick a box in the same commit as the task. Old plan, stories, ADRs: docs/archive/ (do not read).

## 0. Hour-0 checklist (Khai, before or while the sessions start)
- [ ] Register the **VNPay sandbox** merchant now (approval takes days); keep TMN code + hash secret in the password manager.
- [ ] Domain with two names: `demo.<domain>` (storefront) and `api.<domain>` (backend); VPS (4 GB RAM minimum, Ubuntu, ssh key); private S3-compatible backup bucket.
- [ ] GitHub repo: enable **secret scanning + push protection** before the first push; commit and push this package first.
- [ ] Per-environment secrets (JWT, cookie, hash peppers) for local / demo / prod live in the password manager, never in chat or repo.
- [ ] Connect Vercel or Cloudflare Pages to the repo (root `apps/storefront`) so W0b can go live.
- [ ] Tools: `npm i -g agent-browser && agent-browser install`; in the repo run `npx skills add vercel-labs/agent-browser` and `pnpm dlx skills add shadcn/ui`, then `ls .claude/skills .agents/skills`: Claude Code reads `.claude/skills/<name>/SKILL.md`, so move anything under `.agents/skills/` there and commit.
- [ ] In Claude Code run `/plugin`, add Anthropic's marketplace and install `frontend-design` (user-level, covers every clone; the marketplace id differs between sources, pick the one `/plugin` lists).
- [ ] Export the 8 PNG references listed in `design-system/vn-commerce-kit/refs/README.md` and commit them.

## 1. Goal, priorities, budget
A public demo where a prospect can browse 900 seeded products by category, search with and without accents, open a
product, add to cart, check out as guest with a Vietnamese address, pay by COD or VNPay sandbox and see the
confirmation. Admin is the stock Medusa dashboard. A mock-mode URL is public early (Gate 0.5) for pitching.
- **P0 (clients see these first)**: home, listing, product, cart, checkout, confirmation, VNPay return. Finished UI is the product here.
- **P1**: search, account lite, deploy + sandbox IPN, README with screenshots.
- **Deferred to fast-follow**: guest order lookup, querydr reconciliation, refund, legacy address mapping, GHN, VietQR, /about, flash sale.
- **UI bar**: ≥ 60 free-licence product photos reused across the seed (sources in `tools/seed/ASSETS.md`; check each licence), skeletons,
  empty/error states on the core flows, mobile-first at 375 px, Vietnamese copy, favicon/OG image, Lighthouse mobile ≥ 90 on home + PDP.
Budget (planning guesses; re-plan at Gate 1): ~32 session-hours summed over lanes (BE ~13, WEB-1 ~11, WEB-2 ~8); about 12–14 h of wall-clock with three lanes.

## 2. Already done (Sprint 0, keep)
Monorepo, local infra (`make up`), CI (lint, typecheck, test, contracts, licences, secrets), contracts pipeline, VNPay golden
vectors, VNPay and GHN simulators, Next + Tailwind v4 + Motion, design tokens in ui-kit, lint rule `vck/no-raw-values`, Be Vietnam Pro font. The documentation tooling was removed when this package was applied.

## 3. Lanes and sessions
| Lane | Owns | Clone |
| --- | --- | --- |
| BE | apps/backend, tools/seed, tools/sims, contracts, infra, Makefile, CI | vck-be |
| WEB-1 | apps/storefront: shell, home, listing, product, search; packages/ui-kit; README + docs/pitch | vck-web1 |
| WEB-2 | apps/storefront: cart, checkout, VNPay return, confirmation, account lite | vck-web2 |

Prompts: docs/sessions/<LANE>.md. Each session works through its list in order. WEB lanes use the mock data layer until the matching BE task is on main.

## 4. Gates (cumulative session-hours)
- **Gate 0 (~5)**: B0 and W0 on main; CI green; backend boots; storefront shell with the shadcn theme renders in mock mode.
- **Gate 0.5 (~5.5)**: W0b live: public URL, demo banner, noindex; redeploys on every push.
- **Gate 1 (~17)**: browse + COD checkout work in real mode on `make up` + mini seed; `make e2e` COD green; simulator VNPay journey green; UI QA done on home, listing, product, cart, checkout.
- **Gate 2 (~32)**: full 900 seed, search, deployed demo with sandbox IPN received, reset job, README screenshots; manual sandbox checks (G1) done; tag `demo-1.0`.

## 5. Tasks
Format: id · lane · what · verify. Operations: contracts/openapi.yaml; pages: design-system/pages/.

### Gate 0 / 0.5
- [x] **B0** · BE · Scaffold with `create-medusa-app` (temp dir, copy into apps/backend) and use the Medusa CLI from here on; backend boots as server + worker; region `reg_vn` (VND, tax inclusive), one sales channel, publishable key (idempotent); `src/lib/money.ts` (`Vnd`, `formatVnd`, `toVnpAmount`) + tests (0, 999,999,999). Verify: `make up && pnpm dev` serves `/app` and `/store`; CI green.
- [x] **W0** · WEB-1 · UI foundation + shell: Tailwind v4, Motion and the tokens already exist: run `shadcn init` on top and map the MASTER tokens into the theme (keep `vck/no-raw-values`; disable it per line with a reason only in generated shadcn files if flagged); Motion with `MotionConfig reducedMotion="user"`; layout, header (search, cart badge), mobile menu (Sheet), footer, Sonner toasts, skeletons. **Data layer** `lib/data` with `real` (copied from the Medusa Next.js starter: cart, checkout, customer, orders, regions) and `mock` (fixtures; mock cart in a cookie) behind `NEXT_PUBLIC_API_MODE`; minimal fixtures typed with `@medusajs/types` in `contracts/fixtures/medusa/` (products, categories, regions, carts, shipping, complete). Verify: home renders in mock mode at 375/1440 and looks finished (QA loop); lint, typecheck, build.
- [x] **W0b** · WEB-1 · Public mock deploy: demo banner (`NEXT_PUBLIC_DEMO_BANNER=1`: "Dữ liệu demo, không phải cửa hàng thật"), `noindex` meta + robots Disallow, host settings in `apps/storefront/README.md`. Verify: the public URL renders on a phone.

### Launch (order = customer value first)
- [x] **B1a** · BE · Mini catalogue (base: the scaffold's `seed.ts` via `npx medusa exec`) so WEB can go real early: 3-level categories, 60 products with variants, VND prices, images from `tools/seed/assets/`; `make seed` idempotent; **`make record-fixtures`** replaces W0's hand-written Medusa fixtures with recorded ones. Verify: Store API lists products by category; `pnpm --filter storefront typecheck` passes.
- [x] **B3** · BE · Checkout COD: cart → flat-rate shipping → COD (manual payment provider) → order; reserved inventory against oversell; confirmation email (Mailpit); `make e2e` COD journey. Verify: two concurrent checkouts of the last unit produce one order.
- [x] **B5** · BE · VN address: 2-tier province/ward dataset (source + licence in the commit message), `/store/vn-address/*`, address validation on the cart. Verify: 63 provinces load; checkout accepts a province + ward.
- [ ] **B4** · BE · VNPay: payment provider (create URL, return signature for display only), `/hooks/vnpay/ipn` (signature, idempotent on TxnRef + vnp_TransactionNo, settles via workflow); golden vectors + simulator tests; sandbox credentials from env. Verify: §6 tests; the simulator settles an order only through the IPN. **Stop; Khai reads the diff before push.**
- [ ] **B2** · BE · Search: Meilisearch via the Medusa search module, accent-insensitive (`phở` = `pho`), facets category/price/availability, `/store/search` per contract. Verify: 10-query relevance check in the report.
- [ ] **B1b** · BE · Full seed: 900 products, ≥ 60 licensed photos reused with resized variants, `tools/seed/ASSETS.md` (sources + licences); `make seed` < 10 min. Verify: counts via `make seed-verify`.
- [x] **W1** · WEB-1 · Home + category listing (hero, category tiles, featured rails, facets in a Drawer on mobile, sort, pagination, skeletons, empty state) per home.md and product-listing.md; real mode after B1a. Verify: QA loop at 375/1440 against `refs/home-*.png` and `refs/product-listing-*.png`.
- [x] **W2** · WEB-1 · Product page (Carousel gallery, variant picker, price, add to cart with Motion feedback, related) per product-detail.md; search (Command palette + results page) per search.md after B2. Verify: QA loop against `refs/product-detail-*.png`; real mode.
- [x] **W3** · WEB-2 · Cart Sheet + guest checkout (single page: contact, province/ward Combobox, flat shipping, COD or VNPay) per checkout.md; VNPay return shows "đang xác nhận" and polls until the backend says paid; confirmation page; `e2e/cod.spec.ts` and `e2e/vnpay-sim.spec.ts` (Playwright config already targets a running stack; add the `make e2e` target). Verify: `make e2e`; QA loop against `refs/checkout-*.png`.
- [ ] **W4** · WEB-2 · After Gate 1 only: account lite (login, register, orders from the starter data layer, restyled) and a branded 404. Verify: QA loop.
- [x] **W5** · WEB-1 · Polish pass over all P0 pages: spacing, motion consistency, copy review, favicon/OG, Lighthouse mobile ≥ 90 (numbers in the report), reduced-motion check.

### Demo gate
- [ ] **D1** · BE · Deploy: `infra/compose.prod.yaml` (backend server + worker, postgres, redis, meilisearch, minio, Caddy HTTPS), `.env.prod.example`, `make demo-reset` (reseed + wipe orders nightly), backup script to S3-compatible storage with a restore check; README: fresh-VPS steps and a cloudflared tunnel recipe so the VNPay sandbox can reach the IPN from a laptop [verify the sandbox IPN setting]. Verify: `/health/ready` 200 over HTTPS; sandbox IPN reaches the server.
- [ ] **D2** · WEB-1 · README with screenshots captured automatically from the finished pages, demo URL + demo account, 5-bullet video outline; `docs/pitch/one-pager.md` (scope, timeline, reference price range for SME clients; numbers left `[X]` for Khai). Verify: README renders.
- [ ] **G1** · Khai · Manual sandbox checks on the deployed demo: (1) a real VNPay sandbox payment settles by IPN; (2) wrong-signature IPN via curl is rejected; (3) the same IPN twice settles once; (4) leave the return page, IPN still marks it paid; (5) abandoned payment stays unpaid; (6) money diffs read (B3, B4). Tag `demo-1.0`.

### Fast-follow (pull in order after the demo)
- [ ] **F1** · BE · querydr reconciliation for pending payments + VNPay refund; **F2** · BE · guest order lookup (code + phone, rate limited) + WEB page.
- [ ] **F3** · BE · legacy 3-tier address mapping; **F4** · BE · GHN quote + waybill + tracking, WEB shipping step.
- [ ] **F5** · BE · VietQR; **F6** · extract `medusa-vnpay-vck` and `medusa-vn-address-vck` to packages/; **F7** · ADM KPI, CSV, packing slips; **F8** · /about case study, flash sale, reviews, SEO, ZNS.

## 6. Tests (only these) and automation
| Area | Test |
| --- | --- |
| Money | `money.test.ts`: integer VND, formatting, ×100 only in the VNPay adapter |
| Payment truth + IPN | Golden vectors pass; tampered body, wrong secret, replayed or concurrent duplicate IPN → rejected or settles once; return URL never marks paid |
| Oversell | Two concurrent checkouts of the last unit → one order, one 409 |
| Journeys | `make e2e` (Playwright): COD journey and VNPay-simulator journey, browse → cart → checkout → confirmation |
Everything else is verified by typecheck, lint, build and the `agent-browser` QA loop (CLAUDE.md §2.4). No unit tests for UI components or small validation.

## 7. Cut from the demo (do not build)
Guest order lookup, reconciliation job and refund, legacy address mapping, /about, flash sale, rehearsal spreadsheet and
`make rehearse`, custom admin widgets, CSV, packing slips, ZNS, reviews, wishlist, deletion, feeds, load/chaos suites, performance gates.

## 8. Risks
- VNPay sandbox approval takes days: start it in hour 0; the simulator covers everything until then.
- shadcn adds ~10 dependencies: CI's licence gate and exact pinning apply; add a licence exception only with a written reason.
- Product photos decide how professional the demo looks: check each source licence before use; no brand photos.
- Meilisearch accent folding may need a custom setting; fall back to Postgres `unaccent` if relevance is poor.
- A public mock URL shows fake data: banner + noindex stay until the real store replaces it.
- Without the reconciliation job, a lost IPN leaves an order pending; fine for the sandbox demo, not for production (§9).

## 9. Production delta (before any client pays; none of this is in the demo)
- [ ] Real email provider (SPF/DKIM/DMARC) replaces Mailpit; order and payment emails tested to a real inbox.
- [ ] Sentry (or equivalent) on backend and storefront with PII scrubbing; alert on failed IPN.
- [ ] querydr reconciliation + refund (F1) shipped; backups run daily and a **restore was tested** into a clean machine.
- [ ] VNPay production keys entered at a hidden prompt on the server (never in chat, repo or shell history); IPN URL registered.
- [ ] Rate limits on auth and checkout routes; privacy policy and terms published; cookie notice if analytics added.
- [ ] `make demo-reset` disabled in production; demo banner and noindex removed; seed data wiped.
- [ ] One real smallest-value transaction goes through the whole flow (pay → IPN → email → refund) and is reconciled.
