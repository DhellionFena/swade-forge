#!/bin/sh
set -eu

echo "[start] waiting for database"
node ./scripts/wait-for-db.js

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[start] running migrations"
  node ./node_modules/typeorm/cli.js migration:run \
    -d dist/infrastructure/persistence/datasource.js
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[start] running seed"
  node dist/infrastructure/seed/index.js
fi

echo "[start] launching API on port ${PORT:-3001}"
exec node dist/main.js
