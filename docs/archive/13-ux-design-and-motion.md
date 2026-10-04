# UX Design System and Motion
Version 1.0 · 2026-09-29 · Owner: Tech lead (WEB lane) · Normative sources: `design-system/vn-commerce-kit/MASTER.md`, `pages/*.md`

## 1. Tooling: UI UX Pro Max skill
The storefront design is produced and checked with the **ui-ux-pro-max** skill (github.com/nextlevelbuilder/ui-ux-pro-max-skill,
MIT). It is a local, offline design-intelligence database (styles, palettes, font pairings, UX guidelines, GSAP
presets, stack guidance) queried by a Python script; it never makes network calls.

### 1.1 Install (project-level, pinned — VCK-009)
```
npx ui-ux-pro-max-cli@<pinned> init --ai claude     # writes .claude/skills/ui-ux-pro-max/ (committed)
python3 --version                                    # Python 3 required, stdlib only
```
Project-level install (not global) so every lane session and CI use the same version. Record the version in
ADR-013 and upgrade only via a `chore(web)` PR that re-runs §1.3 and diffs the output.

### 1.2 How sessions use it (token-aware, docs/11)
| Task | Do | Don't |
| --- | --- | --- |
| Build/modify a page | Read `MASTER.md` + `pages/<page>.md` (≤ 250 lines total) | Re-run `--design-system` |
| Targeted concern (a11y, form UX, chip overflow) | One query: `search.py "<2–5 terms>" --domain ux` | Load `references/quick-reference.md` whole |
| Stack detail | `search.py "<terms>" --stack nextjs` | Mix legacy/major versions |
| Motion preset | `search.py "<interaction>" --domain gsap` then map to our tokens (§4) | Paste raw preset durations |
| Pre-delivery | MASTER §6 checklist + §6 below | Skip reduced-motion check |
Script path: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py`. Its `data/` CSVs are read by the script, never
by the model (deny-listed in `.claude/settings.json`). Never `--persist --force` without tech-lead approval.

### 1.3 How the design system was generated
```
search.py "e-commerce retail fashion modern" --design-system --persist -p "VN Commerce Kit" \
  --output-dir . --variance 6 --motion 7 --density 5
search.py "ecommerce sales admin dashboard" --design-system --density 8 --motion 3 --variance 3   # admin reference only
search.py "vietnamese ecommerce" --domain typography
```
Output was then curated; every deviation and its reason is in MASTER §0 (notably: Rubik lacks a Vietnamese subset;
generated landing pattern was SaaS-oriented; contrast fixes).

### 1.4 When a client brings a Figma file
Extract tokens and frames with the Figma MCP (e.g. `get_figma_data`) → write `design-system/<client>/MASTER.md`
from the brand (colours, type, radius) → keep our component specs and motion system → run the MASTER §6 checklist on
the client palette and record contrast fixes as deviations. Figma wins on brand; this doc wins on behaviour, a11y and motion.

## 2. Design direction (why it fits the domain)
- **Merchandising is bold, buying is calm.** Vibrant block surfaces (hero, bento, flash sale) create energy on
  discovery pages; PLP/PDP/checkout stay minimal so products and prices dominate and trust stays high.
- **Vietnamese-first.** Be Vietnam Pro for flawless diacritics; copy in natural Vietnamese; VND formatting; trust
  signals VN shoppers look for (COD, đổi trả, freeship thresholds, VNPay/VietQR logos, verified reviews with photos, Zalo).
- **Mobile-first.** Majority of VN e-commerce traffic is mobile: sticky bottom buy bar, floating sort/filter dock with
  a full-screen filter panel, bottom sheets for forms, thumb-reachable CTAs, 44px targets.
- **Owner on the go.** The admin has a reduced mobile layout for the two jobs owners do from a phone: handling orders
  and resolving payment mismatches (pages/admin.md).
- **Premium but fast.** Motion adds feedback and delight but never costs LCP/INP (budgets §4.5).

## 3. Screen inventory (WEB and ADM stories)
| Screen | Page file | Story | Key MI |
| --- | --- | --- | --- |
| Shell (header, global footer, drawers, toasts) | MASTER §5 | VCK-006 | MI-01, MI-02, MI-18, MI-20 |
| Home | pages/home.md | VCK-104 | MI-03, MI-04, MI-05, MI-06 |
| Category | pages/product-listing.md | VCK-104 | MI-06, MI-07, MI-21 |
| Search | pages/search.md | VCK-107 | MI-17, MI-22 |
| PDP | pages/product-detail.md | VCK-105 | MI-08, MI-09, MI-10, MI-11 |
| Cart & checkout | pages/checkout.md | VCK-201, VCK-206, VCK-607 | MI-12, MI-13, MI-14, MI-15 |
| Address form, shipping, tracking | pages/checkout.md, pages/account.md | VCK-404, VCK-405 | MI-13, MI-16, MI-23 |
| Account, wishlist, reviews | pages/account.md | VCK-301..303, VCK-606 | MI-11, MI-23 |
| Admin dashboard, orders, slips, import, recon, audit | pages/admin.md | VCK-501..505 | MI-24 |
| Guest order lookup | pages/order-lookup.md | VCK-407 (UI), VCK-406 (module) | MI-23 |
| Policy / content pages | pages/content-policy.md | — (go-live prerequisite) | — |
| Error & system states | pages/system-states.md | VCK-701 (status codes) | — |
| Email & Zalo ZNS templates | pages/notifications.md | VCK-601, VCK-602 | — |
| Flash sale campaign | pages/flash-sale.md | VCK-104 | MI-05, MI-25, MI-29, MI-32, MI-33 |
| About & store locator | pages/about.md | — (content) | MI-25, MI-28, MI-29, MI-33 |
| Cross-page transitions, audit | — | VCK-705 | MI-19 + all |

### 3.1 Interactive prototype (reference for WEB/ADM sessions)
Canvas artifact: https://claude.ai/artifact/CD7TNzMoiL8m3BR6c4Zi6z — synthetic data only (demo brand "VCK Shop",
36-product catalogue, demo login `demo@example.test` / `Demo@1234`); unknown business facts are `[placeholders]`.

| Row | Desktop board | Mobile board(s) |
| --- | --- | --- |
| 1 Browse & buy | `Main`, `Product`, `Checkout` (incl. VNPay/VietQR result states) | `MobileHome`, `MobileProduct`, `MobileCheckout` |
| 2 Find | `Category`, `Search` | `MobileCategory`, `MobileSearch` |
| 3 Account | `Account` | `MobileAccount` |
| 4 Admin | `Admin` | `MobileAdmin` |
| 5 Service | `Track`, `Policy` | `MobileTrack`, `MobilePolicy` |
| 6 System & messages | `States`, `Emails` | `MobileStates` |
| 7 Campaign & brand | `FlashSale`, `About` | `MobileFlashSale`, `MobileAbout` |

Rules: the page override files are the spec; the prototype shows intended states and flows. When they disagree, fix
the page file first (doc-keeper) and note it in the PR. Admin boards use the storefront palette as a stand-in only
(MASTER §7). Revision 2026-09-30: groups 2–3 redesigned (horizontal filter bar, instant search, tabbed account with
route map), global footer + sticky-footer shell added, admin desktop + mobile added; desktop checkout with VNPay pending/failed and VietQR expiry states added; guest order lookup, policy template,
error/system states and email/ZNS templates added, footer links wired to them. Motion layer v2 applied to every board (§4.6, §5.1); flash sale and about pages
added; demo-mode banner (VCK-806) on home and admin.

## 4. Motion system
### 4.1 Libraries (ADR-013)
| Layer | Tool | Used for |
| --- | --- | --- |
| CSS transitions | Tailwind + tokens | Hover, focus, press, colour changes (most interactions) |
| Motion (`motion/react`) | client leaf components | Enter/exit, layout animations (chips, tabs, cart lines), drawers (spring), shared `layoutId` in gallery, FLIP add-to-cart |
| View Transitions API | small helper / framework support in the pinned Next.js version | PLP → PDP shared product image (MI-19); graceful no-op where unsupported |
| GSAP + ScrollTrigger | dynamically imported on home/campaign routes only | Bento stagger, campaign storytelling bands; never on PLP/PDP/checkout |
Licence of each library verified and recorded when pinned (VCK-009).

### 4.2 Tokens (`packages/ui-kit/src/motion.ts` + CSS variables)
| Token | Value | Use |
| --- | --- | --- |
| `--dur-instant` | 100ms | Press, toggle |
| `--dur-fast` | 160ms | Hover, fades, tab indicator |
| `--dur-base` | 220ms | Dropdowns, chips, list items |
| `--dur-slow` | 320ms | Drawers, dialogs, page-level transitions |
| `--dur-expressive` | 480ms | Hero/bento reveals, success moment |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default |
| `--ease-enter` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Elements entering |
| `--ease-exit` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Elements leaving |
| `spring.drawer` | stiffness 380, damping 34 | Cart/filter drawers |
| `spring.pop` | stiffness 500, damping 22 | Badge bump, heart |
| `stagger` | 50ms, max 8 items then 0 | Lists, bento |
| `distance` | 8px (small), 16px (reveal), 24px (hero) | Translate on enter |
Rules: exit ≈ 70% of enter duration; one easing family per interaction; skill preset durations are mapped to these tokens.

### 4.3 Principles
1. Motion explains cause → effect (the item goes *to* the cart), confirms actions, or preserves context (shared image).
2. Only `transform` and `opacity` (and `clip-path` for reveals); never animate width/height/top/left — progress/stock
   bars use `scaleX` on an inner element.
3. Interruptible: rapid clicks cancel/redirect animations; the final semantic state, focus and content are always correct.
4. No motion on money: prices and totals change instantly (quantity may roll; totals may not).
5. Scroll reveals (MI-25) are tied to entry (start as the element enters, done at 20% coverage) and are allowed on
   home, campaign, about, policy, order-lookup, account overview and error pages. **Never** on PLP/search product grids,
   checkout steps or admin tables (people scan these; use the mount stagger MI-31 instead).
6. Autoplay (hero) pauses on hover, focus, hidden tab and offscreen; has visible pause control.

### 4.4 Reduced motion
`MotionProvider` reads `prefers-reduced-motion` (and a user toggle in the footer). When reduced: no translate/scale/
parallax/confetti/autoplay; replace with opacity ≤ 100ms or instant state; skeleton shimmer becomes static; View
Transitions disabled. E2E runs a reduced-motion pass (TS-19).

### 4.6 Motion layer v2 (shared CSS, all boards)
One stylesheet (`packages/ui-kit/src/motion.css`, prototype `style[data-vck-motion="v2"]`) provides:
- **Scroll-driven effects with CSS** (`animation-timeline: view()` / `scroll()`), wrapped in
  `@media (prefers-reduced-motion: no-preference)` + `@supports`. Unsupported browsers get the static final state —
  content is never hidden by default. No scroll listeners → no INP cost.
- **Mobile frames / nested scrollers**: the scroller declares `scroll-timeline: --pg` and the frame
  `timeline-scope: --pg`, so fixed siblings (back-to-top, header shadow, reading progress) follow the inner scroll.
- Utility classes: `sr-up|sr-fade|sr-scale|sr-left|sr-right|sr-stg` (MI-25), `plx|plx-slow` decorative parallax (MI-29),
  `fill-x` (MI-32), `hdr-scroll|hdr-m` (MI-26), `to-top` (MI-27), `read-progress` (MI-28), `stg` mount stagger (MI-31),
  zero-specificity press/hover feedback for buttons, chips, tabs, cards (MI-30).
- The `reduceMotion` prop / `.rm` class and the OS setting both disable everything above.

### 4.5 Performance and a11y budgets
| Budget | Target |
| --- | --- |
| Motion JS on PLP/PDP | ≤ 25 KB gz (Motion, tree-shaken `m` + `LazyMotion`) |
| GSAP | 0 KB on PLP/PDP/checkout; lazy chunk on home only |
| INP (p75, mobile) | < 200 ms |
| CLS | < 0.1 (skeletons match final boxes) |
| LCP element | never animated on first paint |
| Simultaneous animations | ≤ 6 elements per frame on mobile |
| Focus | visible during and after every transition; drawers trap/restore focus |

## 5. Interaction catalogue (MI)
| ID | Interaction | Behaviour (tokens) | Story |
| --- | --- | --- | --- |
| MI-01 | Header condense | On scroll > 80px: height 72→56, shadow-md; hides on scroll down (mobile), shows on scroll up; fast/standard | VCK-006 |
| MI-02 | Menu / category drawer | Drawer spring from left; items stagger 50ms (max 8) | VCK-006 |
| MI-03 | Campaign hero | Crossfade slides expressive; subtle scale 1.04→1 on image (not LCP first paint); pausable autoplay 6s | VCK-104 |
| MI-04 | Category bento reveal | GSAP stagger from centre, y 16px + opacity, once | VCK-104 |
| MI-05 | Flash-sale countdown & stock bar | Digit flip per second (reduced: plain text); stock bar fills on enter | VCK-104 |
| MI-06 | Product card | Hover lift y -4px + shadow-md, second image crossfade fast; quick-add slides up base; mobile: "+" button | VCK-104 |
| MI-07 | Filters | Chips layout animation base; grid shows skeleton after 150ms if data pending; result count `aria-live` | VCK-104 |
| MI-08 | PDP gallery | Swipe with momentum; thumbnail indicator `layoutId`; zoom on tap/hover (pointer: fine) | VCK-105 |
| MI-09 | Variant change | Image crossfade fast; swatch selection ring scale 0.9→1 instant; price swaps instantly | VCK-105 |
| MI-10 | Add to cart | Thumbnail FLIP flies to cart icon slow/enter; badge bump spring.pop; drawer opens spring.drawer; `aria-live` "Đã thêm vào giỏ" | VCK-105, VCK-201 |
| MI-11 | Wishlist heart | Scale 1→1.25→1 spring.pop + 6-particle burst (reduced: colour change only) | VCK-606 |
| MI-12 | Cart line edits | Quantity digit roll; remove = collapse height via layout + undo toast | VCK-201 |
| MI-13 | Checkout stepper | Progress bar and step indicator morph base; step content slides 16px + fade | VCK-201, VCK-404 |
| MI-14 | Payment waiting | VNPay pending: soft pulse + progress text; VietQR: scan-line over QR + countdown ring | VCK-206, VCK-607 |
| MI-15 | Order success | Check-mark path draw expressive + restrained confetti ≤ 1.2s once; order number focus | VCK-201, VCK-206 |
| MI-16 | Tracking timeline | Line draws to current step, current dot pulses twice | VCK-405 |
| MI-17 | Search suggestions | Completions update inline (left rail desktop / chips under input mobile); matched text highlighted; keyboard focus follows | VCK-107 |
| MI-18 | Toasts | Enter from bottom base, exit fast; stack max 3 | VCK-006 |
| MI-19 | PLP → PDP shared image | View transition of product image; fallback fade | VCK-705 |
| MI-20 | Skeleton shimmer | 1.2s linear gradient sweep; reduced: static | VCK-006 |
| MI-21 | Filter / sort popover | Opens below its pill: opacity + y -6px→0 base/enter; chevron rotates 180°; outside click/Esc closes fast | VCK-104 |
| MI-22 | Instant search results | Results/rows re-enter opacity .4→1 + y 4–6px ≤ 260ms on each debounced update; no height jump (reserve rows) | VCK-107 |
| MI-23 | Parcel route map | Progress fill + truck marker move to the current node 600ms standard; current node ring; reduced: jump | VCK-405 |
| MI-24 | Admin surfaces | Drawer from right 320ms enter; mobile panel/sheet slide; chart bar heights 420ms on range change; ≤ 260ms fades | VCK-501..505 |
| MI-25 | Scroll reveal | Sections/cards translateY 24px + fade (or scale .94 / ±28px x) linked to view entry 0% → cover 20%; `sr-stg` offsets siblings | VCK-705 |
| MI-26 | Header elevation | Sticky header gains shadow + opaque bg over first 120px of scroll; logo scales to .9 (transform only) | VCK-006 |
| MI-27 | Back to top | Round button fades/slides in between 300–700px scroll; `#top` anchor; mobile variant above bottom bars | VCK-006 |
| MI-28 | Reading progress | 3px primary bar scaled by document/scroller progress on long-form pages | VCK-705 |
| MI-29 | Decorative parallax | Hero shapes move ±24–40px across their view range; never the LCP image | VCK-104 |
| MI-30 | Press & hover feedback | Buttons/chips/tabs scale .97 on press (100ms); clickable cards lift shadow on hover | VCK-006 |
| MI-31 | Mount stagger | List/grid children fade + y 8px, 40ms steps, capped at 8 | VCK-104, VCK-107 |
| MI-32 | Bar fill on view | Stock/share bars grow `scaleX` 0→1 on entry (inner bar keeps its value) | VCK-501 |
| MI-33 | Campaign micro-interactions | Flip-digit countdown (per changed digit), live-slot pulse, sliding slot indicator, "Sắp hết" pulse, bell ring on reminder, claimed chip pop, cart pill slide-up, map pin bounce + ripple, timeline line drawn by scroll | VCK-104 |

### 5.1 Motion coverage by board (prototype audit 2026-09-30)
| Board(s) | Interaction | Scroll |
| --- | --- | --- |
| Main / MobileHome | MI-03..06, 10, 11, 18, 30 | MI-25 sections, 26, 27; mobile header condense (JS) |
| Product / MobileProduct | MI-08..11, 18, 30 | MI-25 details/reviews/related, 26, 27 |
| Category / MobileCategory | MI-06, 07, 11, 21, 30, 31 | MI-26, 27 (no grid reveal by rule) |
| Search / MobileSearch | MI-17, 22, 30, 31 | MI-26, 27 |
| Checkout / MobileCheckout | MI-12..15, 30, 31 | none by rule (calm checkout) |
| Account / MobileAccount | MI-16, 23, 30, 31 | MI-25 cards, 26, 27 |
| Track / MobileTrack | MI-23, 30 | MI-25, 26, 27, 29 |
| Policy / MobilePolicy | MI-30 | MI-25, 26, 27, 28 |
| States / MobileStates | MI-30 + bob/rotate illustrations | MI-25, 26, 27 |
| FlashSale / MobileFlashSale | MI-05, 30, 31, 33 | MI-25, 26 (slot bar), 27, 29, 32 |
| About / MobileAbout | MI-30, 33 | MI-25, 26, 27, 29, timeline draw |
| Admin / MobileAdmin | MI-24, 30, 31 | MI-26, 32 (no reveal by rule) |
| Emails | MI-30 | — |

Note: in the canvas overview desktop boards may render at full content height, so document-scroll effects (MI-26..28)
are best reviewed by opening a board on its own at browser height; mobile boards scroll inside their 390×844 frame.

## 6. Design QA gate (WEB/ADM Definition of Done addition)
- [ ] Page follows MASTER + page override; no raw hex/px outside tokens (lint rule)
- [ ] MI items listed for the story implemented with tokens; interruptible; reduced-motion variant verified
- [ ] MASTER §6 checklist passed; axe 0 serious; keyboard path recorded
- [ ] Screenshots 375/768/1440 + 10–20 s screen recording of the interactions attached to the PR
- [ ] Lighthouse mobile ≥ 90 and bundle budgets (§4.5) green in CI
