# ADR-005 Contract scope: custom endpoints only
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-004, docs/04

## Context
Medusa core Store/Admin APIs are large and versioned by Medusa; re-specifying them would drift.

## Decision
`contracts/openapi.yaml` specifies only custom routes, hooks and feeds. Core APIs are consumed through `@medusajs/js-sdk`
types; fixtures for core responses live in `contracts/fixtures/core/` and are refreshed on Medusa upgrades.

## Consequences
Core API behaviour changes surface in upgrade PRs (E2E must pass); frontend mocks for core flows rely on recorded fixtures.
