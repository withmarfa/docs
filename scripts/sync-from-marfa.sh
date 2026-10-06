#!/usr/bin/env bash
# Sync what the docs take from the Marfa monorepo:
#   openapi.json                      the API description
#   src/generated/GLOSSARY.md         the glossary, which the content lint reads
#   src/generated/marfa-release.json  the latest release tag, shown in the sidebar
#
# Reads committed files from a checkout of the monorepo, by default the sibling
# at ../marfa. Set MARFA_ROOT to use another. Nothing is generated: the
# monorepo's CI keeps its openapi.json current, so the checkout should be on an
# up-to-date main.
#
# Everything is checked before anything is written, and the spec is copied into
# place only once it has parsed. A copy that failed halfway used to leave the
# published API reference empty with nothing saying so.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_ROOT="$(dirname "$SCRIPT_DIR")"
MARFA_ROOT="${MARFA_ROOT:-$DOCS_ROOT/../marfa}"
SPEC="$DOCS_ROOT/openapi.json"
GENERATED="$DOCS_ROOT/src/generated"

if [ ! -d "$MARFA_ROOT" ]; then
  echo "Monorepo not found at $MARFA_ROOT. Set MARFA_ROOT to its path." >&2
  exit 1
fi

# MARFA_ROOT defaults to the sibling checkout, which on a machine running
# several worktrees is the one most likely to be stale. Say so here rather
# than letting it surface later as a spec that does not match.
if [ ! -f "$MARFA_ROOT/pnpm-workspace.yaml" ]; then
  echo "Not a Marfa monorepo checkout: $MARFA_ROOT (no pnpm-workspace.yaml)." >&2
  echo "Set MARFA_ROOT to the monorepo you meant." >&2
  exit 1
fi

for file in openapi.json GLOSSARY.md; do
  if [ ! -s "$MARFA_ROOT/$file" ]; then
    echo "No $file in $MARFA_ROOT. Nothing has changed." >&2
    exit 1
  fi
done

# Validate the source, never the committed copy here: an empty or contaminated
# file has to be caught while the real spec is still on disk untouched.
if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$MARFA_ROOT/openapi.json" > /dev/null 2>&1; then
  echo "$MARFA_ROOT/openapi.json is not valid JSON. $SPEC is unchanged." >&2
  exit 1
fi

# The latest release tag. The monorepo also carries tags that are not releases,
# so only version tags count. A checkout without them cannot say what is
# released, and publishing a guess would put a wrong version on every page.
if ! RELEASE="$(git -C "$MARFA_ROOT" describe --tags --abbrev=0 --match 'v[0-9]*' 2>/dev/null)"; then
  echo "No release tag found in $MARFA_ROOT (run 'git fetch --tags' there). Nothing has changed." >&2
  exit 1
fi

CANDIDATE="$(mktemp "${TMPDIR:-/tmp}/marfa-openapi.XXXXXX")"
cleanup() { rm -f "$CANDIDATE"; }
trap cleanup EXIT

cp "$MARFA_ROOT/openapi.json" "$CANDIDATE"
mv "$CANDIDATE" "$SPEC"
trap - EXIT

mkdir -p "$GENERATED"
cp "$MARFA_ROOT/GLOSSARY.md" "$GENERATED/GLOSSARY.md"
printf '{"version":"%s"}\n' "$RELEASE" > "$GENERATED/marfa-release.json"

echo "openapi.json, GLOSSARY.md and the release ($RELEASE) synced from $MARFA_ROOT"
