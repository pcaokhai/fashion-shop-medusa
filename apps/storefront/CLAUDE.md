# apps/storefront — CLAUDE.md
Next.js App Router storefront, Vietnamese UI. Lanes **WEB-1** (shell, home, listing, product, search) and **WEB-2**
(cart, checkout, VNPay return, confirmation, account lite). This is the first thing a prospect sees: it must look finished.

## Stack
Tailwind v4 + shadcn/ui (Radix) themed from MASTER tokens · Motion for animation · Lucide icons · Sonner toasts ·
Embla (Carousel), cmdk (Command), Vaul (Drawer) through shadcn · react-hook-form + Zod for forms.
Add components with `pnpm dlx shadcn@latest add <name>`; customise via the theme and variants, never by hand-building primitives.

## Data layer (`src/lib/data`)
- `real`: derived from the official Medusa Next.js starter's data/actions (cart, checkout, customer, orders, regions)
  using the Medusa JS SDK against `localhost:9000`; copy its logic, not its look; check its licence first.
- `mock`: reads `contracts/fixtures/medusa/`; mock cart state lives in a cookie. Selected by `NEXT_PUBLIC_API_MODE`.
- `NEXT_PUBLIC_DEMO_BANNER=1` shows the demo banner; any public non-production deploy is `noindex`.

## Design sources (priority order; details in design-system/vn-commerce-kit/README.md)
1. `MASTER.md` + `pages/<page>.md`. 2. `refs/<page>-*.png`: open before building, compare after. 3. shadcn blocks/components.
4. `frontend-design` skill for composition and polish only; it never overrides tokens, fonts or the page specs.
5. `prototype/*.dc.html`: markup only, one board per task, only for microcopy/states the spec lacks.

## Rules for this app
- Server Components by default; client components small and at the leaves (cart, forms, pickers, gallery).
- Money is integer VND; display only through `formatVnd`. Never do arithmetic on formatted strings.
- Motion: `MotionConfig reducedMotion="user"`; subtle entrance, hover/tap feedback, cart-drawer and add-to-cart feedback,
  `whileInView` reveals on home only. No GSAP, no second animation system.
- Forms: required fields + phone format only on the client; the server validates.
- The VNPay return page only displays state and polls the order; it never marks anything paid.
- Do not edit `contracts/openapi.yaml`; report a missing field and wait for "contract pushed".
- Fixtures and copy stay synthetic (no real names, phones, addresses).

## Commands and QA
`pnpm --filter storefront dev` (WEB-1 8000, WEB-2 8001) · `pnpm typecheck` · `pnpm lint` · `pnpm build` · `make e2e`.
UI QA loop (CLAUDE.md §2.4): `agent-browser open http://localhost:<port>/<path>` → screenshots at 375 and 1440 px →
`snapshot -i` → compare with `design-system/vn-commerce-kit/pages/<page>.md` → fix → max 2 rounds.
