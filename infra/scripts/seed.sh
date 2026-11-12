#!/bin/sh
set -eu

# Seeds the catalog and the bootstrap admin.
# Phase 0 ships a placeholder; real seed data arrives in Phase 2.

echo "[seed] running catalog seed"
npm run db:seed -w @forja/backend
