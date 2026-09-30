# Documentation index — VN Commerce Kit
Everything needed to start Sprint 0 is here; nothing lives only in chat.

| # | Document | Purpose | Primary audience | Status |
| --- | --- | --- | --- | --- |
| 01 | [PRD](01-prd.md) | Why, for whom, objectives, releases | everyone | v1.0 |
| 02 | [Software architecture](02-software-architecture.md) | Drivers, C4, runtime views, cross-cutting, extension catalogue | all lanes | v1.0 |
| 03 | [Integration spec](03-integration-spec.md) | VNPay, VietQR/bank webhook, GHN rules | PKG, BE | v1.0 ([verify] items open) |
| 04 | [API contract](04-api-contract.md) | Conventions, errors, endpoint + event catalogue | BE, PKG, WEB, ADM | v1.0 |
| 05 | [Data model](05-data-model.md) | Ownership, custom tables, links, indexes | BE, PKG, ADM | v1.0 |
| 06 | [User stories](06-user-stories.md) | 58 stories with numbered AC | all lanes | v1.0 |
| 07 | [Delivery plan](07-delivery-plan.md) | Lanes, slices, sprints, DoR/DoD, playbook | tech lead, lanes | v1.0 |
| 08 | [Test strategy](08-test-strategy.md) | Pyramid, gates, seed data, TS-01..22, chaos | all lanes | v1.0 |
| 09 | [Risk register](09-risk-register.md) | Pre-mortem | tech lead | v1.0 |
| 10 | [Engineering standards](10-engineering-standards.md) | Principles, patterns, conventions, review checklist | all lanes | v1.0 |
| 11 | [AI workflow & token budget](11-ai-workflow-and-token-budget.md) | Context rules, sessions, subagents, skill authoring | all sessions | v1.0 |
| 12 | [Documentation lifecycle](12-documentation-lifecycle.md) | ADR, PROGRESS, BUG, RELEASE rules | all | v1.0 |
| 13 | [UX design & motion](13-ux-design-and-motion.md) | UI UX Pro Max usage, design direction, motion system, MI catalogue, design QA | WEB, ADM | v1.0 |
| 14 | [Guest order access module](14-guest-order-access-module.md) | Options, ports/adapters, workflows, storage, reuse checklist (ADR-014) | PKG, WEB | v1.0 |
| — | [Design system](../design-system/vn-commerce-kit/MASTER.md) | Curated tokens + page overrides | WEB | v1.0 |
| — | [ADRs](adr/) | ADR-001..014 | all | Accepted |
| — | [PROGRESS](progress/PROGRESS.md) · [Bugs](bugs/README.md) · [Releases](releases/README.md) · [Plans](plans/README.md) · [Runbooks](runbooks/README.md) | Living records | all | living |

## Reading order
- **Day 1 (everyone)**: root `CLAUDE.md` → 01 §1–4 → 02 §2–6 → 07 §1–3 → 11 → 12.
- **PKG**: `packages/CLAUDE.md` → 03 → 04 → 05 → 14 → ADR-004/006/007/008/012/014.
- **BE**: `apps/backend/CLAUDE.md` → 04 → 05 → 10 → ADR-002/007/008.
- **ADM**: `apps/backend/CLAUDE.md` §layout → 04 §4 admin rows → 05 → 10 §0.
- **WEB**: `apps/storefront/CLAUDE.md` → `design-system/vn-commerce-kit/MASTER.md` → 13 → 04 → `contracts/openapi.yaml` → ADR-003/013.
- **PLAT/QA**: `tools/CLAUDE.md` → 08 → 07 → 09.

## Conventions
English docs, Vietnamese UI copy. Dates ISO (`yyyy-mm-dd`), money integer VND. IDs: `VCK-<epic><nn>` stories,
`VCK-<id>-AC<n>`, `FR-nn`, `NFR-nn`, `TS-nn`, `R-nn`, `A-nn`, `ADR-nnn`, `BUG-nnn`, rulings `R-<story>-<n>`.
RFC 2119 words (MUST/SHOULD/MAY). Docs change in the same PR as behaviour. Precedence: root CLAUDE.md §2.
