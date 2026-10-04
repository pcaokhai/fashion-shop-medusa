# tools — CLAUDE.md
Developer tooling owned by lane **BE**: `tools/seed` (seed engine) and `tools/sims` (VNPay and GHN simulators).

## Rules
- Seed data is synthetic and deterministic (fixed seed, fixed names): B1a 60 products, B1b 900, categories, demo customer.
  Never real names, phones, addresses, card or bank data. `make seed` is idempotent and finishes in under 10 minutes.
- Product photos: ≥ 60 images from sources whose licence allows commercial use, kept in `tools/seed/assets/`, reused across
  products with resized variants; every source and licence is recorded in `tools/seed/ASSETS.md`. No brand photos.
- `make record-fixtures` (task B1) records the Medusa Store API responses the storefront uses from the seeded backend into
  `contracts/fixtures/medusa/`; recorded files replace hand-written ones with the same names.
- Simulators implement only what `contracts/` and `contracts/vnpay/golden-vectors.json` describe: signed IPN, return URL,
  `querydr`, refund; GHN status webhook. Failure modes (late, duplicate, wrong signature) are switches, not code forks.
- Seed output (`tools/seed/out/`) and dumps are never read or committed.

## Commands
`make seed` · `make seed-verify` · `make record-fixtures` · `make up | down` (simulators start with the infra)
