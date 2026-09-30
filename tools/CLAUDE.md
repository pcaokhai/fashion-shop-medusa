# tools — CLAUDE.md
Operational tooling owned by lane **PLAT**: realistic/stress data seeding, load tests, chaos scenarios and provider simulators.

## Layout
```
tools/seed/        TS CLI (faker vi) — modes: realistic | stress; deterministic via --seed
tools/load/        k6 scenarios (browse, search, checkout, flash-sale) + thresholds
tools/chaos/       scripts that inject faults (duplicate/out-of-order IPN, worker kill, carrier latency via toxiproxy)
tools/sims/vnpay/  VNPay simulator: pay page, IPN sender with fault modes, querydr/refund API
tools/sims/ghn/    GHN simulator: fee/create/cancel + webhook replayer
```

## Rules
- Seed: base catalogue/customers through Medusa workflows (consistency); historical orders via bulk COPY into a staging
  schema then a verified insert step; always finish with `make seed-verify` (docs/08 §4).
- Seed data is synthetic: names from faker `vi`, phones `0900000xxx`, emails `@example.test`, addresses from real admin units only.
- Scenarios are declarative (YAML) so new ones need no code; each states the invariant it checks.
- Simulators implement the documented behaviour in docs/03 and reproduce `contracts/vnpay/golden-vectors.json`.
- Never point tools at production. `--target` must match an allow-list (`local`, `staging`).

## Commands
```
make seed-realistic      # ~900 products / ~4k variants / 20k customers / 100k orders over 12 months
make seed-stress         # 50k products / 1M orders (staging only; ~40 GB disk budget)
make seed-verify         # integrity checks (orphans, totals, stock, link tables)
make load SCENARIO=flash-sale
make chaos SCENARIO=ipn-duplicate
```
