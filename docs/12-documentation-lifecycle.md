# Documentation Lifecycle — ADR, PROGRESS, BUG, RELEASE
Version 1.0 · 2026-09-29 · Owner: Tech lead

Documentation changes ship in the same PR as the behaviour they describe. The `doc-keeper` subagent (docs/11 §5)
does the mechanical updates; the tech lead approves them in review.

## 1. Triggers
| Event | Update | Who |
| --- | --- | --- |
| Hard-to-reverse or cross-lane decision | New `docs/adr/ADR-<nnn>-<slug>.md` (template ADR-000) + link from docs/02 §10 | lane proposing it; tech lead accepts |
| Story merged | PROGRESS log entry; "Now" block | lane session (doc-keeper) |
| Slice checkpoint | PROGRESS checkpoint row | tech lead |
| Bug found (test, review, chaos, prod) | `docs/bugs/BUG-<nnn>-<slug>.md` + row in `docs/bugs/README.md` | whoever finds it |
| Bug fixed | BUG file closed with root cause + regression test id; index row updated | fixing lane |
| Feature/slice released | `docs/releases/RELEASE-<x.y.z>.md`, `CHANGELOG.md`, PROGRESS "Now" reset | tech lead |
| Contract/data/integration change | `contracts/`, docs/03/04/05 in same PR | lane |

## 2. PROGRESS (`docs/progress/PROGRESS.md`)
Single source of truth for "where are we" between sessions. Structure:
1. **Now** (≤ 15 lines): sprint, goal, in-progress stories by lane, blocked items, next review items, open rulings.
2. **Checkpoints**: table slice · date · result · evidence link.
3. **Log** (newest first), one entry per merged story, ≤ 8 lines:
```
### 2026-10-14 · VCK-203 VNPay provider and IPN · PKG · merged #42
- AC: 1–6 proven by vnpay.ipn.spec.ts, vnpay.concurrency.spec.ts
- Decisions: ADR-007 applied; Ruling R-203-1 (OrderInfo ASCII only)
- Bugs: opened BUG-004 (closed), none open
- Metrics: coverage src/lib 96%; tokens ≈ 410k; compactions 1
- Follow-ups: VCK-204 can start
```
4. **Retro notes** per sprint: metrics from docs/07 §10 + one improvement.

## 3. BUG records (`docs/bugs/`)
- File per bug: `BUG-<nnn>-<slug>.md` from `BUG-000-template.md`; ids sequential, never reused.
- Severity: S1 money/data loss or security · S2 broken journey, no workaround · S3 workaround exists · S4 cosmetic.
- Lifecycle: OPEN → INVESTIGATING → FIXED (merged) → VERIFIED (regression test in CI + checked on staging) → CLOSED.
- Must contain: reproduction steps, expected/actual, evidence (tailed logs, trace id), root cause (5 whys),
  fix PR, **regression test id**, affected release, lessons (optional: new rule in docs/10 or docs/11).
- S1/S2 found after a release ⇒ listed in the next RELEASE "Bugs fixed" and in retro.
- Workflow: systematic-debugging → write the failing regression test → fix → verification-before-completion.

## 4. RELEASE records (`docs/releases/`)
- `make release VERSION=x.y.z` drafts `RELEASE-x.y.z.md` from Conventional Commits + Changesets; the tech lead completes it.
- Sections: summary · features (story ids, flags enabled) · bugs fixed (BUG ids) · integration changes (docs/03 edits,
  provider behaviour) · migrations (and rollback safety) · metrics (k6/Lighthouse/coverage deltas) · known issues ·
  upgrade/rollback steps · demo clip links.
- `CHANGELOG.md` (Keep a Changelog format) gets a concise entry linking the RELEASE file.
- Release checklist: flags of previous release removed; risk register reviewed; BUG files for this release closed or
  listed as known issues; `make docs-check` green; tag pushed.
- Client delivery (any copy leaving the private repo): exclude .claude/skills/ui-ux-pro-max/ until ADR-013 records an upstream licence confirmation (package.json says MIT, README says CC-BY-NC-4.0).

## 5. ADRs (`docs/adr/`)
Template `ADR-000-template.md`; ≤ ~30 lines; status Proposed → Accepted → Superseded by ADR-<nnn> (never delete);
one decision per ADR; link the story that validates it. Plans may record small **Rulings** (`R-<story>-<n>`) that
don't merit an ADR; promote a ruling to an ADR if a second story depends on it.

## 6. Checks (`make docs-check`)
Validates: required docs exist; YAML/JSON parse; story ids referenced exist; ADR links resolve; BUG files have required
fields and closed bugs have regression test ids; RELEASE files have all sections; PROGRESS "Now" ≤ 15 lines.

Shipped now (VCK-008): BUG records (fields; closed bugs need a root cause and a regression test id), PROGRESS "Now" ≤ 15
lines, RELEASE files with every section of `RELEASE-template.md` (derived from the template at check time), required
files present and non-empty, BUG and RELEASE index rows matching the files on disk. DEFERRED: dead links, story-id
existence, ADR link resolution, YAML/JSON parse. Author rule: a required RELEASE section that is empty or still the
template's own placeholder fails; write `None.` when nothing applies. Bad record file names (`bug-*`/`release-*` not matching the exact pattern) and unterminated code fences or HTML comments also fail.
