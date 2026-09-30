.PHONY: up down contracts contracts-diff

# A root .env is passed explicitly: compose's project dir is infra/, so it would otherwise be ignored.
COMPOSE := docker compose -f infra/docker-compose.yml $(if $(wildcard .env),--env-file .env)

up:
	$(COMPOSE) up -d --wait --wait-timeout 90

down:
	$(COMPOSE) down $(if $(filter 1,$(v)),-v)

# lint + compile + vectors + generate, then the drift gate (check-generated): fails if generated output or golden vectors
# differ from HEAD. Clean tree passes; after a legitimate spec change it fails until you commit the regenerated files.
contracts:
	pnpm --filter @vck/contracts-tools run contracts

# Breaking-change report against a git ref (default origin/main). Needs oasdiff: go install github.com/oasdiff/oasdiff@latest
BASE ?= origin/main
contracts-diff:
	@command -v oasdiff >/dev/null || { echo "oasdiff not found. Install: go install github.com/oasdiff/oasdiff@latest (or brew install oasdiff)"; exit 1; }
	@t=$$(mktemp -d) && trap 'rm -rf "$$t"' EXIT && git show "$(BASE):contracts/openapi.yaml" > "$$t/base.yaml" && oasdiff breaking "$$t/base.yaml" contracts/openapi.yaml
