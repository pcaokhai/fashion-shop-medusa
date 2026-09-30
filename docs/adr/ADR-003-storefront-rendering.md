# ADR-003 Storefront rendering strategy
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-006, VCK-703, VCK-704

## Context
SEO and mobile speed matter for catalogue pages; cart/checkout/account must always be fresh.

## Options considered
1. Fork the official Medusa Next.js starter as-is — quick, but its structure differs from our feature-folder rules.
2. Next.js App Router built on our feature-folder layout, borrowing starter patterns where useful.

## Decision
Option 2. Catalogue pages: Server Components + ISR with cache tags, revalidated by backend events (≤ 5 s).
Cart/checkout/account: dynamic, never cached. Client components only at interactive leaves.

## Consequences
Needs signed revalidation route and subscriber; checkout always uses live cart prices, so stale PLP prices cannot be charged.
