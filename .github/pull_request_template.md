## Story
VCK-<id> · Lane: <PLAT|BE|ADM|PKG|WEB> · Slice: <S#|—> · Flag: <FF_…|—> · Plan: docs/plans/VCK-<id>.md

## What and why
<2–4 lines>

## AC → tests
| AC | Test |
| --- | --- |
| VCK-<id>-AC1 | `<file>::<test name>` |

## Checklist
- [ ] Tests written first; `make lint typecheck test contracts` and `make docs-check` green (tailed output below)
- [ ] Domain rules (docs/10 §0): money, payment truth, idempotency, PII, audit
- [ ] No contract changes (or linked contract PR merged first)
- [ ] Observability added for new I/O; nothing sensitive logged
- [ ] Docs updated as applicable ([docs/12 §1](docs/12-documentation-lifecycle.md)):
  - [ ] [contracts](contracts/) · docs/03, docs/04
  - [ ] [data model](docs/05-data-model.md)
  - [ ] [ADR](docs/adr/)
  - [ ] [PROGRESS](docs/progress/PROGRESS.md)
  - [ ] [BUG](docs/bugs/) records
  - [ ] [RELEASE](docs/releases/) draft
- [ ] UI: screenshots mobile + desktop, keyboard check (WEB/ADM)
- [ ] New dependency? name@version — why
- [ ] Risk and rollback note

## Verification output
```
<tail -n 40>
```
