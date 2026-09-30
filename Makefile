.PHONY: up down contracts contracts-check contracts-diff docs-check

# A root .env is passed explicitly: compose's project dir is infra/, so it would otherwise be ignored.
COMPOSE := docker compose -f infra/docker-compose.yml $(if $(wildcard .env),--env-file .env)

up:
	$(COMPOSE) up -d --wait --wait-timeout 90

down:
	$(COMPOSE) down $(if $(filter 1,$(v)),-v)

# `make contracts` regenerates (lint + compile + vectors + generate; exit 0 when the checks pass).
# `make contracts-check` = regenerate, then fail if generated output or golden vectors differ from what is committed
# (run before pushing; CI runs the same package scripts).
contracts:
	pnpm --filter @vck/contracts-tools run contracts

contracts-check:
	pnpm --filter @vck/contracts-tools run contracts-check

# Breaking-change report against a git ref (default origin/main). Needs oasdiff: go install github.com/oasdiff/oasdiff@v1.32.1
BASE ?= origin/main
contracts-diff:
	@command -v oasdiff >/dev/null || { echo "oasdiff not found. Install: go install github.com/oasdiff/oasdiff@v1.32.1 (or brew install oasdiff)"; exit 1; }
	@t=$$(mktemp -d) && trap 'rm -rf "$$t"' EXIT && git show "$(BASE):contracts/openapi.yaml" > "$$t/base.yaml" && oasdiff breaking "$$t/base.yaml" contracts/openapi.yaml

# Validates BUG records and PROGRESS "Now" (docs/12 §6); exits 1 on any violation.
docs-check:
	node tools/docs/check.mjs
