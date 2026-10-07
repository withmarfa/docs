#!/usr/bin/env bash
# Sync what the docs take from the Marfa monorepo:
#   openapi.json                      the API description
#   src/generated/GLOSSARY.md         the glossary, which the content lint reads
#                                     and the Glossary page includes
#   src/generated/api-overview.md     the spec's info.description, the rules every
#                                     operation follows, included by the API
#                                     reference overview
#   src/generated/marfa-commands.md   the marfa command's reference, from its own
#                                     help, included by the marfa command page
#   src/generated/error-codes.md      the contract's table of error codes, which
#                                     the server generates from its own code
#                                     list, included by the Errors page
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

for file in openapi.json GLOSSARY.md core/marfa-cli/COMMANDS.md conformance/spec/errors.md; do
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
OVERVIEW="$(mktemp "${TMPDIR:-/tmp}/marfa-overview.XXXXXX")"
COMMANDS="$(mktemp "${TMPDIR:-/tmp}/marfa-commands.XXXXXX")"
ERRORS="$(mktemp "${TMPDIR:-/tmp}/marfa-errors.XXXXXX")"
cleanup() { rm -f "$CANDIDATE" "$OVERVIEW" "$COMMANDS" "$ERRORS"; }
trap cleanup EXIT

# The overview page includes this file under its own level-2 heading, so every
# heading moves down one level to keep the page's outline unbroken.
if ! python3 - "$MARFA_ROOT/openapi.json" "$OVERVIEW" <<'PY'
import json, re, sys

# Any other shape than a description string is a refusal, never a traceback.
spec = json.load(open(sys.argv[1]))
info = spec.get("info") if isinstance(spec, dict) else None
description = info.get("description") if isinstance(info, dict) else None
if not isinstance(description, str) or not description.strip():
    sys.exit(1)

lines, fence = [], None
for line in description.strip().splitlines():
    marker = re.match(r"\s*(`{3,}|~{3,})", line)
    if marker and (fence is None or marker.group(1).startswith(fence)):
        fence = None if fence else marker.group(1)
    elif fence is None and re.match(r"#{1,5} ", line):
        line = "#" + line
    lines.append(line)

with open(sys.argv[2], "w") as out:
    out.write("\n".join(lines) + "\n")
PY
then
  echo "$MARFA_ROOT/openapi.json has no info.description. Nothing has changed." >&2
  exit 1
fi

# The command page has its own title, so the reference loses its generated-file
# comment and its level-1 title. Nothing else changes: its headings already sit
# below the page's.
if ! python3 - "$MARFA_ROOT/core/marfa-cli/COMMANDS.md" "$COMMANDS" <<'PY'
import re, sys

try:
    lines = open(sys.argv[1], encoding="utf-8").read().splitlines()
except UnicodeDecodeError:
    sys.exit(1)
i = 0
if i < len(lines) and lines[i].lstrip().startswith("<!--"):
    while i < len(lines) and "-->" not in lines[i]:
        i += 1
    i += 1
while i < len(lines) and not lines[i].strip():
    i += 1
if i < len(lines) and re.match(r"# ", lines[i]):
    i += 1
body = "\n".join(lines[i:]).strip()
if not body:
    sys.exit(1)

with open(sys.argv[2], "w", encoding="utf-8") as out:
    out.write(body + "\n")
PY
then
  echo "$MARFA_ROOT/core/marfa-cli/COMMANDS.md is not UTF-8 or holds nothing after its title. Nothing has changed." >&2
  exit 1
fi

# The code table is the part of the errors chapter between its two markers,
# which the monorepo's CI holds to the server's own list of codes.
if ! python3 - "$MARFA_ROOT/conformance/spec/errors.md" "$ERRORS" <<'PY'
import sys

try:
    text = open(sys.argv[1], encoding="utf-8").read()
except UnicodeDecodeError:
    sys.exit(1)
start, end = "<!-- errors-table:start -->", "<!-- errors-table:end -->"
if text.count(start) != 1 or text.count(end) != 1:
    sys.exit(1)
rest = text.partition(start)[2]
if end not in rest:
    sys.exit(1)
rows = rest.partition(end)[0].strip().splitlines()
if len(rows) < 3 or not all(line.startswith("|") for line in rows):
    sys.exit(1)

with open(sys.argv[2], "w", encoding="utf-8") as out:
    out.write("\n".join(rows) + "\n")
PY
then
  echo "$MARFA_ROOT/conformance/spec/errors.md has no code table between its errors-table markers. Nothing has changed." >&2
  exit 1
fi

cp "$MARFA_ROOT/openapi.json" "$CANDIDATE"
mv "$CANDIDATE" "$SPEC"

mkdir -p "$GENERATED"
mv "$OVERVIEW" "$GENERATED/api-overview.md"
mv "$COMMANDS" "$GENERATED/marfa-commands.md"
mv "$ERRORS" "$GENERATED/error-codes.md"
trap - EXIT
cp "$MARFA_ROOT/GLOSSARY.md" "$GENERATED/GLOSSARY.md"
printf '{"version":"%s"}\n' "$RELEASE" > "$GENERATED/marfa-release.json"

echo "openapi.json, the API overview, GLOSSARY.md, the command reference, the error codes and the release ($RELEASE) synced from $MARFA_ROOT"
