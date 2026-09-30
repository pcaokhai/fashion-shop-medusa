# ADR-001 Monorepo with directory-owned lanes
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-001, docs/07

## Context
One owner runs several parallel Claude Code sessions. Conflicts and cross-cutting edits must be structurally prevented.

## Options considered
1. Polyrepo per app/plugin — isolation, but contract changes need multi-repo PRs; heavy for one person.
2. pnpm + Turborepo monorepo with lanes owning directories — atomic contract changes, affected-only CI.

## Decision
Option 2. Lanes PLAT, BE, ADM, PKG, WEB own directories (root CLAUDE.md §5, CODEOWNERS). Shared files belong to PLAT.

## Consequences
Plugins stay publishable (Changesets). Lane boundaries enforced by lint rules. Must keep turbo caching healthy.
