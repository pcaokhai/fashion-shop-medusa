#!/usr/bin/env bash
# Postgres dump -> private S3-compatible bucket (BACKUP_S3_* in .env.prod); keeps the newest 14. Daily cron: 30 2 * * * .../backup.sh
. "$(dirname "$0")/lib.sh"
export BACKUP_DIR; BACKUP_DIR="$(mktemp -d)"; trap 'rm -rf "$BACKUP_DIR"' EXIT
name="vck-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
dc exec -T postgres pg_dump -U "$POSTGRES_USER" -d "${POSTGRES_DB:-vck}" --no-owner | gzip > "$BACKUP_DIR/$name"
[ "$(gzip -dc "$BACKUP_DIR/$name" | wc -c)" -gt 1000 ] || { echo "backup looks empty" >&2; exit 1; }
aws_s3 s3 cp "/b/$name" "s3://$BACKUP_S3_BUCKET/vck/$name" --only-show-errors
aws_s3 s3 ls "s3://$BACKUP_S3_BUCKET/vck/" | awk '{print $4}' | grep '^vck-.*\.sql\.gz$' | sort -r | tail -n +15 | while read -r old; do
  aws_s3 s3 rm "s3://$BACKUP_S3_BUCKET/vck/$old" --only-show-errors
done
echo "backup: uploaded $name"
