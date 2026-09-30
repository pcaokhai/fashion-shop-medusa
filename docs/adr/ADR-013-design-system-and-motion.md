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
Option 3 with motion stack (c). Skill installed project-level from `ui-ux-pro-max-cli@2.15.0` (`init --ai claude --offline`; only `.claude/skills/ui-ux-pro-max/` is vendored); `MASTER.md` + `pages/*.md`
are the design source of truth; regeneration with `--force` needs tech-lead approval and a new deviation review.
Library licences recorded at pin time.
Pin: no version string exists inside the skill, so the pin is the CLI version plus the tree hash
`sha256:26d48ef152b7044793f6c6f72da98fbb780253a4a7f18f4672c8661b9c1d631c` (sorted `path\0bytes` of every file; `node scripts/ui-skill-hash.mjs`, checked by `scripts/ui-skill.test.mjs`).
Licence: MIT (CLI and payload). Python: the skill scripts use the standard library only (no pip); verified on 3.14 locally,
3.12 on ubuntu-24.04 is proven only by the first CI run. `data/**` and `scripts/tests/**` stay Read-denied in `.claude/settings.json`.

## Consequences
Consistent, explainable design decisions (useful in client pitches); small extra curation work on regeneration;
motion budgets enforced in CI (docs/13 §4.5, TS-19).
