# ADR-012 Two-tier Vietnamese address model with legacy mapping
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-401, VCK-402, VCK-404, R-05

## Context
Vietnam moved to a two-tier local administration (province → ward/commune) in 2025. Customers, saved addresses and
carriers may still use old three-tier names and codes.

## Decision
Store addresses as province + ward codes of the current model, keep the free-text street line, and resolve old
(province, district, ward) inputs through `vn_legacy_ward_map`. Carrier codes are stored per ward when mappable.
Data source, version and licence are recorded here during VCK-401 (to be filled: source · version · licence · date).

## Consequences
Clean model for new data; ambiguity handled explicitly in UI; dataset updates become a versioned data migration.
