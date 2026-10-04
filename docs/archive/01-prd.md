# Product Requirements Document — VN Commerce Kit
Version 1.0 · 2026-09-29 · Owner: Khai (product owner, tech lead)

## 1. Summary
VN Commerce Kit is a production-grade online store for a Vietnamese SME with ~900 products, built on Medusa v2 and
Next.js. It serves two purposes: a live, credible portfolio system to win freelance e-commerce clients, and a reusable
kit of Vietnamese commerce plugins (payments, shipping, addresses, notifications) that cuts delivery time on future projects.

## 2. Contacts
| Name / role | Responsibility | Comment |
| --- | --- | --- |
| Khai — PO, tech lead, reviewer | Scope, contracts, reviews every PR, releases | Review capacity is the bottleneck (docs/07 §1) |
| PLAT lane (Khai + Claude Code) | Infra, CI, contracts, seed/load/chaos tools | |
| BE lane (Claude Code session) | Medusa app: modules, workflows, store/hook routes | |
| ADM lane (Claude Code session) | Admin widgets/routes + admin API | |
| PKG lane (Claude Code session) | Reusable VN plugins | |
| WEB lane (Claude Code session) | Next.js storefront | |

## 3. Background
The requirement set comes from a real SME brief found in a Facebook "website on demand" group: ~900 products, VNPay,
customer accounts and dashboard, product/order/customer management, search and filters, responsive, post-launch
maintenance, an existing design needing a better eye. Competing offers were theme-based ("demo in 45 minutes").
Medusa v2 (currently v2.21) now ships a modular framework, workflows with compensation, an extensible admin and a
first-party search module, which makes a custom-quality store feasible for a solo developer. No VNPay provider exists
for Medusa v2, which is both a gap and the core reusable asset of this project.

## 4. Objective
| Objective | Key results |
| --- | --- |
| Correct money handling | 0 orders completed without a verified IPN/query; 100% of chaos payment scenarios (TS-10..14) keep invariants |
| Production quality | p95 PDP TTFB < 300 ms (cached) / < 800 ms (uncached) at 50 RPS; checkout API p95 < 600 ms; Lighthouse mobile ≥ 90 |
| Realistic scale | Realistic seed (900 products, ~4k variants, 20k customers, 100k orders) loads in < 20 min and passes `seed-verify` |
| Reusability | ≥ 5 plugins installable in a blank Medusa app in < 15 min each with README only |
| Engineering quality | Coverage ≥ 80% backend/plugins, ≥ 90% on pure `src/lib`; 0 critical CVEs; every AC traced to a test |
| Business | Public demo + case study + 2-min video by end of Sprint 7; used in ≥ 5 client pitches |

## 5. Market segments
- **SME retailers moving off marketplaces/Facebook** (JTBD: own a branded channel with VN payments and shipping, without monthly SaaS lock-in).
- **Brands with custom workflows** (B2B price lists, pre-order, multi-warehouse) that outgrow Sapo/Haravan themes.
- **Agencies/freelancers** (the kit itself): ship VN-ready stores faster with tested plugins.

## 6. Value propositions
| Job | Gain | Pain avoided | Why better than alternatives |
| --- | --- | --- | --- |
| Sell online with VN payments | VNPay, VietQR, COD with reconciliation | Paid-but-no-order, double charges | Theme sites rarely reconcile; SaaS limits custom flows |
| Ship reliably | Live GHN fees, auto waybills, tracking | Manual copy-paste to carrier portals | Integrated and idempotent webhooks |
| Operate daily | KPI dashboard, bulk import, packing slips, audit | Spreadsheets, no accountability | Built into the admin staff already use |
| Grow | SEO, feeds, reviews, Zalo notifications | Invisible on Google/Meta, low trust | Modular: enable per client |

## 7. Solution
### 7.1 UX
Client design (Figma, when available) is the visual source for brand; the default theme is the curated UI UX Pro Max
design system (`design-system/vn-commerce-kit/`) with the motion system and interaction catalogue in `docs/13`.
Screens: home, category (PLP with facets), search, PDP, cart drawer, checkout (address → shipping → payment), VNPay
return, order tracking (signed-in and guest lookup by code + phone), account (profile, addresses, orders, wishlist, deletion). Admin: Medusa dashboard + widgets.

### 7.2 Key features
| Feature | Description | Epic |
| --- | --- | --- |
| Platform | Monorepo, infra, CI, contracts pipeline, observability, docs lifecycle, design system | E0 |
| Catalogue & search | Categories, variants, images/CDN, accent-insensitive search with facets, seed data | E1 |
| Cart, checkout, payments | Checkout, COD, VNPay (IPN, reconciliation, refund), oversell protection | E2 |
| Customer accounts | Auth, dashboard, wishlist, account deletion | E3 |
| Addresses & shipping | 2-tier VN addresses with legacy mapping, GHN quote/create/tracking | E4 |
| Admin operations | KPI dashboard, CSV import/export, packing slips, staff audit, reconciliation console | E5 |
| Notifications & engagement | Email, Zalo ZNS, reviews, VietQR transfer | E6 |
| SEO & performance | Metadata/schema.org/sitemap, product feeds, performance budgets | E7 |
| Resilience & operations | Stress seed, load, chaos, production deploy, runbooks, public demo mode | E8 |

### 7.3 Technology
Medusa v2.21 (Node 20+, TypeScript) as server + worker on PostgreSQL 16 and Redis 7; Next.js App Router storefront;
Meilisearch behind the Search Module; S3-compatible storage + CDN; OpenTelemetry + Sentry; Docker images deployed to a
VPS with an AWS reference architecture documented. Details in `02-software-architecture.md`.

### 7.4 Assumptions
| ID | Assumption | How validated | By |
| --- | --- | --- | --- |
| A-01 | Postgres FTS with `unaccent` + trigram gives acceptable VN relevance for 900 products | Relevance set of 50 queries, p95 latency | VCK-106 |
| A-02 | VNPay sandbox behaviour matches docs/03 (encoding, IPN retries, querydr) | Sandbox run recorded as fixtures | VCK-203 |
| A-03 | A reliable 2-tier address dataset with legacy mapping is obtainable under a permissive licence | Source + licence recorded in ADR-012 | VCK-401 |
| A-04 | GHN sandbox accepts 2-tier ward codes or a mapping exists | Sandbox quote/create for 20 wards | VCK-402 |
| A-05 | A single 4 vCPU / 8 GB VPS serves the demo at 50 RPS | k6 run in VCK-802 | VCK-802 |
| A-06 | Zalo ZNS can be demonstrated with a mock provider without an OA approval | Provider contract tests | VCK-602 |

## 8. Release
| Release | Content | When |
| --- | --- | --- |
| R0.1 | Browse, search, cart, checkout with COD, accounts | End of Sprint 2 |
| R0.2 | VNPay payments with IPN + reconciliation | End of Sprint 3 |
| R0.3 | 2-tier VN addresses, GHN shipping + tracking, refunds, admin KPI + reconciliation console | End of Sprint 4 |
| R0.4 | Import/export, packing slips, audit, email notifications, VietQR | End of Sprint 5 |
| R0.5 | Reviews, wishlist, account deletion, Zalo ZNS, SEO/feeds, performance, motion polish | End of Sprint 6 |
| R1.0 | Load + chaos results, production deploy, runbooks, public demo | End of Sprint 7 |
| R1.1 | Guest order lookup + COD self-cancel with OTP (module `medusa-guest-order-access-vck`, option A) | End of Sprint 8 |

Out of scope for R1.0: marketplace/multi-vendor, subscriptions, POS, marketplace sync (Shopee/TikTok Shop),
e-invoice integration, loyalty points, AI features, multi-language storefront. These are catalogued as extension
candidates in `02-software-architecture.md` §12.
