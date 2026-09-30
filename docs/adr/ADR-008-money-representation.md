# ADR-008 Money as integer VND
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-005, docs/10 §0

## Context
VND has no minor unit in practice; VNPay expects amount × 100; floats cause rounding bugs.

## Decision
All amounts are integer VND (`Vnd` branded type, bigint/bigNumber columns). Conversion to VNPay units happens only in
`toVnpAmount()` inside the VNPay adapter. Percentages (discounts, tax-inclusive splits) round half-up to whole VND at
line level, documented per calculation.

## Consequences
Simple arithmetic and display; multi-currency would need a new ADR.
