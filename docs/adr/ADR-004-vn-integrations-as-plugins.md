# ADR-004 Vietnamese integrations as standalone Medusa plugins
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: packages/CLAUDE.md, VCK-106/203/401/402/602/604

## Context
The main long-term asset is reuse across client projects; no Medusa v2 VNPay plugin existed at research time.

## Options considered
1. Implement integrations inside `apps/backend` — faster initially, not reusable.
2. Each integration as a plugin package with options, own module, tests, README.

## Decision
Option 2. Plugins never import from apps; pure logic in `src/lib`; options validated with Zod; sandbox/production by option.

## Consequences
Slight overhead per package; enables "install + configure < 15 min" (NFR-11) and potential open-sourcing.
