#!/usr/bin/env bash
# Regenerate openapi.json from the monorepo server.
# Requires the monorepo to be cloned as a sibling of this repo
# (../marfa) with deps installed.
#
# The generate runs into a temporary file and only replaces the committed
# spec once it has produced valid JSON. It used to redirect straight into
# openapi.json, and a redirect truncates its target before the command on
# the left has run: a failed generate therefore emptied the published API
# reference, and `set -e` aborted at that failure before reaching the JSON
# check written to catch exactly this. The file was left at zero bytes,
# twenty-one thousand lines deleted, and nothing said so.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_ROOT="$(dirname "$SCRIPT_DIR")"
MARFA_ROOT="${MARFA_ROOT:-$DOCS_ROOT/../marfa}"
SPEC="$DOCS_ROOT/openapi.json"

if [ ! -d "$MARFA_ROOT" ]; then
  echo "Monorepo not found at $MARFA_ROOT. Set MARFA_ROOT to its path." >&2
  exit 1
fi

# MARFA_ROOT defaults to the sibling checkout, which on a machine running
# several worktrees is the one most likely to be stale. Say so here rather
# than letting it surface as a dependency error from inside pnpm.
if [ ! -f "$MARFA_ROOT/pnpm-workspace.yaml" ]; then
  echo "Not a Marfa monorepo checkout: $MARFA_ROOT (no pnpm-workspace.yaml)." >&2
  echo "Set MARFA_ROOT to the monorepo you meant." >&2
  exit 1
fi

if [ ! -d "$MARFA_ROOT/node_modules" ]; then
  echo "Dependencies are not installed in $MARFA_ROOT." >&2
  echo "Run 'pnpm install' there, then re-run this script." >&2
  exit 1
fi

CANDIDATE="$(mktemp "${TMPDIR:-/tmp}/marfa-openapi.XXXXXX")"
cleanup() { rm -f "$CANDIDATE"; }
trap cleanup EXIT

if ! (cd "$MARFA_ROOT" && pnpm --silent --filter @withmarfa/server generate:openapi) > "$CANDIDATE"; then
  echo "Generate failed. $SPEC is unchanged." >&2
  exit 1
fi

if [ ! -s "$CANDIDATE" ]; then
  echo "Generated spec is empty. $SPEC is unchanged." >&2
  exit 1
fi

# Validate the candidate, never the committed file: an empty or contaminated
# generate has to be caught while the real spec is still on disk untouched.
if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$CANDIDATE" > /dev/null 2>&1; then
  echo "Generated spec is not valid JSON. $SPEC is unchanged." >&2
  exit 1
fi

mv "$CANDIDATE" "$SPEC"
trap - EXIT

echo "openapi.json synced from $MARFA_ROOT"
