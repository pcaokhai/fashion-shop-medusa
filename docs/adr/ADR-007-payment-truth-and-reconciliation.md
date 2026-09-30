# ADR-007 Payment truth from IPN and reconciliation only
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-203/204/505/604, docs/03 §4

## Context
Browser returns can be lost, replayed or forged; IPNs can be duplicated, delayed or missing. Money correctness is the
top objective.

## Decision
- Orders for online payments are completed only by the IPN, reconciliation (`querydr`) or bank-webhook workflows.
- A reconciliation row is created at payment initiation; every attempt ends MATCHED, FAILED, MISMATCH or RESOLVED.
- Return URL is display-only. Provider events are deduped by unique keys. Admin resolves mismatches with audit.

## Consequences
Shoppers may briefly see "pending confirmation"; needs recon job and admin console; enables chaos invariants TS-10..15.
