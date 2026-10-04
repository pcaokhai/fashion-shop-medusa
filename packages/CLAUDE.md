# packages — CLAUDE.md
Shared code. `packages/ui-kit` (lane **WEB-1**): design tokens only, mapped into the shadcn/Tailwind theme of the storefront;
components come from shadcn/ui inside `apps/storefront`, not from here. Reusable Medusa plugins (`medusa-vnpay-vck`,
`medusa-vn-address-vck`, …) are extracted here only after the feature is finished and in use (fast-follow F6); until then
they live in `apps/backend`.

## Rules
- `ui-kit`: tokens only (no raw colour or px values), accessible by default; WEB-2 requests changes through its report.
- Plugins: pure logic in `src/lib` with unit tests, a thin provider class on top; options validated with Zod at load;
  sandbox vs production chosen by an option, never by NODE_ENV; no imports from `apps/**`.
- Exact dependency versions; one line in the commit message for each new dependency.

## Commands
`pnpm --filter <package> build | test | lint | typecheck`
