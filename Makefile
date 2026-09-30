.PHONY: up down

# A root .env is passed explicitly: compose's project dir is infra/, so it would otherwise be ignored.
COMPOSE := docker compose -f infra/docker-compose.yml $(if $(wildcard .env),--env-file .env)

up:
	$(COMPOSE) up -d --wait --wait-timeout 90

down:
	$(COMPOSE) down $(if $(filter 1,$(v)),-v)
