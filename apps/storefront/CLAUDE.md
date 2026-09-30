# apps/storefront — CLAUDE.md
Next.js App Router storefront (Vietnamese UI, VND). Lane **WEB**, owns `apps/storefront/**`.
Talks to Medusa via `@medusajs/js-sdk` (core) and generated client from `contracts/openapi.yaml` (custom).

## Commands
```
pnpm --filter storefront dev               # NEXT_PUBLIC_API_MODE=mock uses MSW; =real hits localhost:9000
pnpm --filter storefront test              # vitest + Testing Library
pnpm --filter storefront test:e2e          # Playwright (also run by make e2e)
pnpm --filter storefront lint | typecheck | build
pnpm --filter storefront gen:api           # regenerate types + MSW handlers from contracts (never edit output)
```

## Layout
```
src/app/(shop)/            home, c/[...category], p/[handle], search, cart, checkout/*, account/*
src/app/api/revalidate/    on-demand revalidation webhook (signed)
src/features/<feature>/    components/, server/ (data loaders, server actions), hooks/, schemas.ts
src/lib/                   sdk.ts, money.ts (formatVnd), seo.ts, analytics.ts, flags.ts
src/generated/             OpenAPI types + MSW handlers — generated, read-only
src/mocks/                 MSW setup using contracts/fixtures
```

## Next.js rules
- Server Components by default; `"use client"` only for interactive leaves (variant picker, cart drawer, forms).
- Data: server loaders with `fetch` cache tags (`product:<id>`, `category:<id>`); mutations via Server Actions; no `useEffect` fetching.
- Catalog pages: ISR + tag revalidation triggered by backend subscriber (price/stock change) — never `revalidate: 0` on PLP/PDP.
- Checkout and account are dynamic and never cached; cart id in an httpOnly cookie.
- VNPay return page shows status from `verifyVnpayReturn`; if `PENDING_CONFIRMATION`, poll order status ≤ 30 s, then show "we'll email you".

## UI rules
- Before any UI work read `design-system/vn-commerce-kit/MASTER.md` and the matching `pages/<page>.md`; they override generic taste.
- Use the **ui-ux-pro-max** skill only for targeted queries (`--domain ux|gsap`, `--stack nextjs`), per docs/13 §1.2.
- Design tokens from `packages/ui-kit`; Tailwind only with tokens; no inline magic colours.
- Motion: tokens from `packages/ui-kit/src/motion.ts`; Motion (`LazyMotion` + `m`) in client leaves; GSAP only via dynamic import on home/campaign; every animation has a reduced-motion path; implement the MI ids of your story (docs/13 §5).
- Prices through `formatVnd()` → "259.000 ₫"; dates `dd/MM/yyyy` in `Asia/Ho_Chi_Minh`.
- Images via `next/image` with CDN loader, explicit sizes; LCP image `priority`.
- Accessibility: labelled inputs, focus management in drawers/dialogs, `aria-live` for cart and payment status.
- Budgets: Lighthouse mobile ≥ 90 on home/PLP/PDP; JS ≤ 170 KB gz per route (checked in CI).

## Tests
- Component tests for every client component with state; E2E for journeys in docs/08 §5.
- Test names include AC ids. Mock mode tests must pass before the real-API checkpoint.
