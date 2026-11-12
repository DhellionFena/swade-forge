#!/bin/sh
set -eu

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "[healthcheck] GET ${BASE_URL}/health/ready"
curl --fail --silent --show-error "${BASE_URL}/health/ready"
echo
