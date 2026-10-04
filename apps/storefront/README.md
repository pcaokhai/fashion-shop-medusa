# apps/storefront

Next.js App Router storefront. Dev: `pnpm --filter @vck/storefront dev` (port 8000 for WEB-1).

## Public mock deploy (Vercel or Cloudflare Pages)
- Root directory: `apps/storefront`; install `pnpm install` from the repo root; build `pnpm build`.
- Environment variables:

| Variable | Mock demo | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_API_MODE` | `mock` | `mock` reads `contracts/fixtures/medusa`; `real` calls Medusa |
| `NEXT_PUBLIC_DEMO_BANNER` | `1` | shows "Dữ liệu demo, không phải cửa hàng thật" |
| `NEXT_PUBLIC_INDEXABLE` | unset | unset = `noindex` meta + `robots.txt` Disallow; `1` only for the real store |

Real mode also needs `MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_REGION_ID` (default `reg_vn`).
Redeploys on every push to `main`. The mock cart lives in a cookie, so no backend is needed.
