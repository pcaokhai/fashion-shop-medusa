# VN Commerce Kit
Production-grade Vietnamese e-commerce on **Medusa v2 + Next.js**, with reusable plugins for VNPay, VietQR bank
transfer, GHN shipping, 2-tier VN addresses, Zalo ZNS and accent-insensitive search. Built as a portfolio system and a
starter kit for client projects.

## Quick start (after Sprint 0)
```
cp .env.example .env
make up            # dependencies + simulators
make dev           # backend (server + worker) + storefront
make seed-realistic
open http://localhost:8000   # storefront
open http://localhost:9000/app  # admin
```

## Repository
| Path | What |
| --- | --- |
| `apps/backend` | Medusa app, custom modules, workflows, admin extensions |
| `apps/storefront` | Next.js storefront |
| `packages/*` | Reusable VN plugins and UI kit |
| `tools/*` | Seed, load, chaos, provider simulators |
| `contracts/` | OpenAPI, event schemas, fixtures, VNPay golden vectors |
| `docs/` | PRD → architecture → stories → plan; ADR, PROGRESS, BUG, RELEASE |

## Working with Claude Code
Read `CLAUDE.md` (auto-loaded) and `docs/README.md`. Workflow uses the Superpowers skills (`docs/07` §9 prompts).
Token rules: `docs/11`. Documentation lifecycle: `docs/12`.
