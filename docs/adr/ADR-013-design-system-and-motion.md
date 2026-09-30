# ADR-013 Design system from UI UX Pro Max, curated; layered motion stack
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-009, VCK-705, docs/13, design-system/

## Context
No client design exists; the portfolio must look premium, fit Vietnamese e-commerce, and animate without hurting
performance or accessibility. Generator output alone had domain errors (font without Vietnamese subset, SaaS landing
pattern, contrast failures).

## Options considered
1. Hand-made design from scratch — slow for a backend-leaning owner.
2. Raw UI UX Pro Max output — fast, but contains the errors above.
3. UI UX Pro Max as design intelligence + curated MASTER with a deviation log.
Motion: (a) GSAP everywhere — heavy on product pages; (b) CSS only — weak for layout/FLIP; (c) layered: CSS → Motion → View Transitions → GSAP on home only.

## Decision
Option 3 with motion stack (c). Skill installed project-level at version `<pin in VCK-009>`; `MASTER.md` + `pages/*.md`
are the design source of truth; regeneration with `--force` needs tech-lead approval and a new deviation review.
Library licences recorded at pin time.

## Consequences
Consistent, explainable design decisions (useful in client pitches); small extra curation work on regeneration;
motion budgets enforced in CI (docs/13 §4.5, TS-19).
