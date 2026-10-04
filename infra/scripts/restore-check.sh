#!/usr/bin/env bash
# Proves the newest backup restores: loads it into a throwaway database and checks the catalogue is there. Touches nothing else.
. "$(dirname "$0")/lib.sh"
export BACKUP_DIR; BACKUP_DIR="$(mktemp -d)"; trap 'rm -rf "$BACKUP_DIR"; dc exec -T postgres psql -U "$POSTGRES_USER" -d postgres -qc "drop database if exists vck_restore_check" || true' EXIT
latest="$(aws_s3 s3 ls "s3://$BACKUP_S3_BUCKET/vck/" | awk '{print $4}' | grep '^vck-.*\.sql\.gz$' | sort | tail -n 1)"
[ -n "$latest" ] || { echo "no backup found" >&2; exit 1; }
aws_s3 s3 cp "s3://$BACKUP_S3_BUCKET/vck/$latest" "/b/$latest" --only-show-errors
dc exec -T postgres psql -U "$POSTGRES_USER" -d postgres -qc "drop database if exists vck_restore_check" -c "create database vck_restore_check"
gzip -dc "$BACKUP_DIR/$latest" | dc exec -T postgres psql -U "$POSTGRES_USER" -d vck_restore_check -q -v ON_ERROR_STOP=1 >/dev/null
products="$(dc exec -T postgres psql -U "$POSTGRES_USER" -d vck_restore_check -tAc "select count(*) from product")"
[ "${products:-0}" -gt 0 ] || { echo "restore check FAILED: no products in $latest" >&2; exit 1; }
echo "restore check OK: $latest has $products products"
