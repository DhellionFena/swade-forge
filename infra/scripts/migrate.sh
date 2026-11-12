#!/bin/sh
set -eu

# Runs migrations against the database configured in apps/backend/.env.
# The backend must be built first (npm run build -w @forja/backend).

echo "[migrate] running pending migrations"
npm run db:migrate -w @forja/backend
