# ADR-010 Documentation lifecycle (ADR, PROGRESS, BUG, RELEASE)
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: docs/12, VCK-008

## Context
Parallel AI sessions forget; a portfolio project must show traceable decisions, defects and releases.

## Decision
Every merged story updates PROGRESS; every bug gets a BUG file with a regression test id; every release gets a RELEASE
file and CHANGELOG entry; decisions that are hard to reverse get an ADR. `make docs-check` enforces formats in CI.
Mechanical updates are delegated to the `doc-keeper` subagent.

## Consequences
Small per-PR overhead; strong handoff between sessions; ready-made material for case studies and interviews.
