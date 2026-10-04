# Sourced by the other scripts. ENV_FILE defaults to .env.prod at the repo root.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
ENV_FILE="${ENV_FILE:-.env.prod}"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE (copy .env.prod.example)" >&2; exit 1; }
set -a; . "./$ENV_FILE"; set +a
dc() { docker compose -f infra/compose.prod.yaml --env-file "$ENV_FILE" "$@"; }
# aws CLI in a container, pointed at the backup bucket (no host install needed)
aws_s3() {
  docker run --rm --add-host host.docker.internal:host-gateway -v "${BACKUP_DIR:-/tmp}:/b" \
    -e AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" -e AWS_DEFAULT_REGION=us-east-1 \
    amazon/aws-cli:2.27.50 --endpoint-url "$BACKUP_S3_ENDPOINT" "$@"
}
