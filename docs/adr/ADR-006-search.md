# ADR-006 Search via Medusa Search Module with Vietnamese normalisation
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-106, VCK-801, NFR-02

## Context
Medusa v2.21 ships a Search Module (Postgres provider by default, zero-downtime index rebuilds). Postgres has no built-in
Vietnamese text-search configuration; shoppers type without diacritics and with typos.

## Options considered
1. Postgres provider + `unaccent` + trigram — no extra service; competes with checkout for DB resources.
2. Custom Meilisearch provider — typo tolerance, fast facets; one more service and a provider to maintain.

## Decision
Implement both behind the same index definitions in `medusa-search-vi-vck`; default Postgres for small shops, Meilisearch
when benchmarks (VCK-106 realistic, VCK-801 stress) exceed NFR-02. Benchmark results appended here.

## Consequences
Portfolio gains a measured comparison; provider maintenance cost accepted.
