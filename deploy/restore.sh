#!/usr/bin/env bash
set -euo pipefail
umask 077

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
BACKUP_DIR="${1:-}"

if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "Usage: RESTORE_CONFIRM=YES $0 <backup-directory>" >&2
  exit 1
fi
if [[ "${RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "Refusing destructive restore. Set RESTORE_CONFIRM=YES explicitly." >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production env file: $ENV_FILE" >&2
  exit 1
fi
if [[ ! -f "$BACKUP_DIR/postgres.dump" || ! -f "$BACKUP_DIR/SHA256SUMS" ]]; then
  echo "Backup is incomplete: postgres.dump or SHA256SUMS missing." >&2
  exit 1
fi

ABS_BACKUP="$(cd "$BACKUP_DIR" && pwd)"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

(
  cd "$ABS_BACKUP"
  sha256sum -c SHA256SUMS
)

printf 'Stopping public application services...\n'
"${COMPOSE[@]}" stop web api || true

printf 'Restoring PostgreSQL...\n'
cat "$ABS_BACKUP/postgres.dump" | "${COMPOSE[@]}" exec -T postgres sh -ec \
  'pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

printf 'Restoring MinIO buckets...\n'
"${COMPOSE[@]}" run --rm -T \
  -v "$ABS_BACKUP:/backup:ro" \
  --entrypoint /bin/sh minio-init -ec '
    mc alias set restore http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
    mc mirror --overwrite --remove /backup/minio/private "restore/$S3_PRIVATE_BUCKET"
    mc mirror --overwrite --remove /backup/minio/public "restore/$S3_PUBLIC_BUCKET"
    mc anonymous set none "restore/$S3_PRIVATE_BUCKET"
    mc anonymous set download "restore/$S3_PUBLIC_BUCKET"
  '

printf 'Applying forward-only migrations after restore...\n'
"${COMPOSE[@]}" run --rm migrate

printf 'Starting API and web...\n'
"${COMPOSE[@]}" up -d api web

printf 'Restore complete from %s\n' "$ABS_BACKUP"
