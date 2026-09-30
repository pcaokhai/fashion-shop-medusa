.PHONY: up down

up:
	docker compose -f infra/docker-compose.yml up -d --wait --wait-timeout 90

down:
	docker compose -f infra/docker-compose.yml down $(if $(v),-v)
