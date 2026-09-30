# packages — CLAUDE.md
Reusable, independently versioned Medusa plugins for Vietnamese commerce, plus the UI kit. Lane **PKG**, owns `packages/**` except `packages/ui-kit/**` (lane WEB).
Goal: each package can be installed in a different client project with only options changed (ADR-004).

| Package | Kind | Story |
| --- | --- | --- |
| `medusa-search-vi-vck` | Search Module Provider (Meilisearch) + Postgres unaccent config | VCK-106 |
| `medusa-payment-vnpay-vck` | Payment Module Provider + IPN route + reconciliation job | VCK-203/204/205 |
| `medusa-payment-vietqr-vck` | Payment provider + bank webhook matcher | VCK-604 |
| `medusa-vn-address-vck` | Module + store routes, 2-tier data, legacy resolver | VCK-401 |
| `medusa-fulfillment-ghn-vck` | Fulfillment Module Provider + webhook | VCK-402/403 |
| `medusa-notification-zns-vck` | Notification Module Provider (Zalo ZNS) | VCK-602 |
| `medusa-guest-order-access-vck` | Module + store routes + workflows: guest lookup, OTP, policy-driven self-cancel; ports for OTP channels, refund adapters, policy, masking, captcha (docs/14) | VCK-406, VCK-408 |
| `ui-kit` | Design + motion tokens, primitives (owned by lane **WEB**) | VCK-009, VCK-006 |

## Commands
```
pnpm --filter <pkg> build | test | lint
pnpm --filter <pkg> test:contract        # replays contracts/fixtures and golden vectors
pnpm changeset                            # every user-visible change needs a changeset (drives RELEASE notes)
```

## Rules
- Layout per plugin: `src/providers/<name>/` (service), `src/modules/`, `src/api/`, `src/workflows/`, `src/lib/` (pure logic).
- **Pure core, thin adapter**: signing, parsing, status mapping, matching live in `src/lib` as pure functions with unit tests;
  the provider class only wires HTTP + Medusa interfaces.
- Options validated with Zod at plugin load; fail fast with a clear message naming the missing option.
- No imports from `apps/**`; peer-depend on `@medusajs/framework` at the version pinned in the root.
- Every outbound HTTP client: timeout, retry policy object, redacting logger, injectable `fetch` for tests.
- Sandbox vs production selected only by options (`mode: "sandbox" | "production"`), never by NODE_ENV.
- Extension by **ports + adapters** (docs/14 §4): client-specific behaviour is a registered adapter or an option, never an
  `if (client === …)` branch inside a package.
- README per package: install, options table, webhook URLs, sequence diagram link (docs/03), known limitations.

## Tests
- Unit ≥ 90% lines on `src/lib`; golden vectors must pass byte-for-byte.
- Provider tests run against simulators in `tools/sims/` (never live sandboxes in CI).
