# ADR-002 Medusa v2 as the commerce engine
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-005, docs/02

## Context
Requirements (catalogue, variants, inventory, cart, orders, customers, promotions, admin) are standard commerce;
differentiation is VN integrations, correctness and UX. Solo capacity ≈ 224 pts.

## Options considered
1. Custom Spring Boot/Go backend — full control; 2–3× effort for commodity features.
2. SaaS (Sapo/Haravan) theme — fast, limited customisation, no reusable engineering asset.
3. WooCommerce — cheap; PHP outside owner's stack; plugin quality risk.
4. Medusa v2 — TypeScript, modules, workflows with compensation, extensible admin, first-party search module (v2.21).

## Decision
Medusa v2 (pin latest 2.21.x), modular monolith with separate server and worker processes.

## Consequences
Faster delivery; follow Medusa upgrade cadence (R-06); some admin UX constrained by Medusa dashboard extension points.
