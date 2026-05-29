#!/usr/bin/env bash
# Regenerate openapi.json from the monorepo server.
# Requires the monorepo to be cloned as a sibling of this repo
# (../marfa) with deps installed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_ROOT="$(dirname "$SCRIPT_DIR")"
MARFA_ROOT="${MARFA_ROOT:-$DOCS_ROOT/../marfa}"

if [ ! -d "$MARFA_ROOT" ]; then
  echo "Monorepo not found at $MARFA_ROOT. Set MARFA_ROOT to its path." >&2
  exit 1
fi

cd "$MARFA_ROOT"
pnpm --silent --filter @withmarfa/server generate:openapi > "$DOCS_ROOT/openapi.json"
cd "$DOCS_ROOT"

# Verify the file parses as JSON (catches shell output contamination).
python3 -c "import json; json.load(open('openapi.json'))" > /dev/null

echo "openapi.json synced from $MARFA_ROOT"
