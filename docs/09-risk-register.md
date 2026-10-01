# Risk Register (pre-mortem)
Version 1.0 · 2026-09-29 · Owner: Tech lead

It is the end of Sprint 7 and the project failed. What happened?

## Tigers
| ID | Risk | Urgency | Mitigation | Owner | Check by |
| --- | --- | --- | --- | --- | --- |
| R-01 | Review bottleneck: lanes produce more than Khai can review; quality drops or work stalls | launch-blocking | ≤ 30 pts/sprint; PR ≤ 400 lines; review-first daily slot; requesting-code-review before human review | Khai | every sprint |
| R-02 | VNPay sandbox access/behaviour differs from docs/03 | launch-blocking | Request sandbox in Sprint 0; simulator first; [verify] items resolved in VCK-203 | Khai | Sprint 3 |
| R-03 | Contract drift between MSW-mocked storefront and backend | launch-blocking | Generated mocks from contract; provider contract tests; checkpoint per slice | PLAT | each slice |
| R-04 | Payment data integrity under failure (duplicate/missing IPN, late payment) | launch-blocking | ADR-007; recon job; chaos TS-10..15 nightly | PKG | Sprint 3, 7 |
| R-05 | Address dataset for 2-tier model incomplete or GHN mapping missing | fast-follow | Source + licence in ADR-012; unmapped-ward report; FLAT_RATE fallback | PKG | Sprint 3 |
| R-06 | Medusa minor upgrades with breaking changes (e.g. v2.16 ORM, v2.21 Store API fields) | fast-follow | Pin minor; monthly upgrade story; release notes read; upgrade PR runs full E2E | BE | monthly |
| R-07 | Token/context blow-up makes lane sessions slow and forgetful | fast-follow | docs/11 rules; fresh session per story; PROGRESS handoff | Khai | Sprint 1 |
| R-08 | "Can the owner explain the code the agents wrote?" fails in a client interview | launch-blocking | Plans kept; ADRs; Khai writes the case study and does 2 code walkthrough recordings | Khai | Sprint 7 |
| R-09 | Demo VPS too small for realistic seed + search | track | k6 in VCK-802; Meilisearch memory cap; upgrade plan documented | PLAT | Sprint 7 |
| R-10 | Scope creep from extension catalogue | track | Extensions only after R1.0 via new stories | Khai | each sprint |
| R-12 | Guest lookup used to enumerate orders or leak PII | launch-blocking for R1.1 | ADR-014: two factors, generic 404, constant time, IP/order limits, captcha, server-side masking; TS-20 in CI; watch `guest_access_event` for sequential scans | PKG | Sprint 8 |
| R-13 | OTP abuse drives ZNS/SMS cost (SMS pumping) | fast-follow | OTP only for cancel; policy checked before sending; 60 s cooldown, 5 sends/h/order, IP limits; alert on send spikes; SMS fallback optional | PKG | Sprint 8 |
| R-11 | Animations hurt performance, accessibility or look "AI-generic" | fast-follow | Motion budgets + reduced-motion E2E (TS-19); curated MASTER, not raw generator output; design QA gate docs/13 §6 | WEB | Sprint 1, 6 |
| R-14 | ui-ux-pro-max licence unresolved (MIT in package.json vs CC-BY-NC-4.0 in README); a client delivery could ship non-commercial content | launch-blocking (client delivery) | Repo private; exclude the skill dir from deliveries (docs/12 §4); confirm upstream; if NC is confirmed, drop the vendored tree and keep MASTER | WEB/PLAT | before first client delivery |
| R-15 | next/sharp ships prebuilt LGPL-3.0 libvips; a client delivery must carry the LGPL notice and keep it replaceable | launch-blocking (client delivery) | Notice file in deliveries (THIRD-PARTY-NOTICES, added when the first delivery is prepared) carrying the Licensing table of the sharp-libvips README (the packages ship no LICENSE/NOTICE file; LGPL-3.0-or-later plus bundled components, e.g. cairo MPL-1.1 and the AOM patent licence); never vendor or patch libvips; pnpm keeps it a normal dependency; licence exceptions in scripts/licence-exceptions.json (R-009-16) | WEB/PLAT | before first client delivery |

## Paper tigers
| Concern | Why not real |
| --- | --- |
| Medusa can't handle 900 products | Scale is small; stress seed tests 50k |
| Next.js ISR shows stale prices | Tag revalidation within 5 s (VCK-704) + checkout always uses live cart prices |
| Need microservices for scale | Modular monolith with worker split meets NFRs; ADR-002 |

## Elephants
| Concern | Investigation |
| --- | --- |
| Portfolio value depends on a design that looks premium; Khai is backend-leaning | Mitigated by UI UX Pro Max design system (VCK-009) + motion audit (VCK-705); still review with 3 real shoppers in Sprint 6 |
| Real clients may still prefer Sapo/Haravan on price | Case study must show TCO and ownership benefits; keep the "economy" offer |
| Legal duties (e-commerce notification to MOIT, PDPL) are client-specific | Document as onboarding checklist for client projects, not code |

## Action plans (launch-blocking)
| Risk | Action | Owner | Due |
| --- | --- | --- | --- |
| R-01 | Measure review queue age daily in PROGRESS; cut scope if > 2 days twice | Khai | Sprint 1 |
| R-02 | Register VNPay sandbox; record fixtures | Khai | Sprint 0 |
| R-03 | VCK-004 merged before any WEB story | PLAT | Sprint 0 |
| R-04 | TS-10..15 green before R0.2 and R1.0 | PKG/PLAT | Sprint 3, 7 |
| R-08 | Architecture walkthrough video + case study draft | Khai | Sprint 7 |
