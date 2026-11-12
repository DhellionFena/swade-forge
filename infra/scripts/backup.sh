#!/bin/sh
set -eu

# Dumps the Postgres database into ./backups and, when Backblaze B2
# credentials are present, uploads the archive.

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/forja-selvagem-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] dumping database to ${FILE}"
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-forja}" \
  -d "${POSTGRES_DB:-forja_selvagem}" \
  | gzip > "${FILE}"

if [ -n "${B2_APPLICATION_KEY_ID:-}" ] && command -v b2 >/dev/null 2>&1; then
  echo "[backup] uploading to Backblaze B2"
  b2 upload-file "${B2_BUCKET_NAME:-forja-selvagem-backups}" "${FILE}" "$(basename "${FILE}")"
else
  echo "[backup] B2 credentials or b2 CLI unavailable; archive kept locally"
fi
