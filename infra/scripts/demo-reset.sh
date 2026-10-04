#!/usr/bin/env bash
# Reset the public demo: wipes the database (orders, carts, payments, customers), uploaded photos and the search index,
# then runs migrations + setup + seed again. The publishable key is stable when PUBLISHABLE_KEY is set in .env.prod.
# Nightly at 03:00 Asia/Ho_Chi_Minh:  0 3 * * * TZ=Asia/Ho_Chi_Minh /opt/vck/infra/scripts/demo-reset.sh >> /var/log/vck-reset.log 2>&1
. "$(dirname "$0")/lib.sh"
echo "demo-reset: stopping app"
dc stop backend-server backend-worker
dc exec -T postgres psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "drop database if exists \"${POSTGRES_DB:-vck}\" with (force)" -c "create database \"${POSTGRES_DB:-vck}\""
dc exec -T redis redis-cli flushall >/dev/null
dc exec -T meilisearch curl -fsS -X DELETE -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/indexes/products >/dev/null || true
dc --profile tools run --rm --entrypoint sh init -c 'rm -rf /app/apps/backend/static/*'
dc --profile tools run --rm init
dc up -d --wait
echo "demo-reset: done"
