#!/usr/bin/env bash
set -euo pipefail
umask 077

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_ROOT}/${STAMP}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production env file: $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$DEST/minio/private" "$DEST/minio/public"
ABS_DEST="$(cd "$DEST" && pwd)"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

printf 'Backing up ChoVot production to %s\n' "$ABS_DEST"

"${COMPOSE[@]}" exec -T postgres sh -ec \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$DEST/postgres.dump"

"${COMPOSE[@]}" run --rm -T \
  -v "$ABS_DEST:/backup" \
  --entrypoint /bin/sh minio-init -ec '
    mc alias set backup http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
    mc mirror --overwrite "backup/$S3_PRIVATE_BUCKET" /backup/minio/private
    mc mirror --overwrite "backup/$S3_PUBLIC_BUCKET" /backup/minio/public
  '

{
  printf 'created_at_utc=%s\n' "$STAMP"
  printf 'git_commit=%s\n' "$(git rev-parse HEAD 2>/dev/null || printf unknown)"
  printf 'compose_file=%s\n' "$COMPOSE_FILE"
} > "$DEST/manifest.txt"

(
  cd "$DEST"
  sha256sum postgres.dump manifest.txt > SHA256SUMS
  find minio -type f -print0 | sort -z | xargs -0r sha256sum >> SHA256SUMS
)

printf 'Backup complete: %s\n' "$ABS_DEST"
