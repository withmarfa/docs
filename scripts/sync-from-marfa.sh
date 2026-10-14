#!/usr/bin/env bash
# Sync what the docs take from the Marfa monorepo:
#   openapi.json                      the API description
#   src/generated/GLOSSARY.md         the glossary, which the content lint reads
#   src/generated/api-overview.md     the spec's info.description, the rules every
#                                     operation follows, included by the API
#                                     reference overview
#   src/generated/cli/                the CLI's global options and exit codes, from
#                                     core/marfa-cli/COMMANDS.md, each section
#                                     without its heading: global-options.md and
#                                     exit-codes.md, which the CLI page includes.
#                                     The directory is replaced whole, so a file
#                                     that is no longer written disappears.
#   src/generated/error-codes.md      the contract's table of error codes,
#                                     written from the server's own code list,
#                                     included by the Errors page
#   src/generated/settings.md         the contract's table of the instance's
#                                     environment settings, written from the
#                                     server's own setting list, included by
#                                     the Settings guide
#   src/generated/core-types.md       the contract's table of the types every
#                                     instance ships, written from the
#                                     server's type registry
#   src/generated/edge-types.md       the same for the shipped edge types
#   src/generated/permissions.md      the same for the twelve permissions
#   src/generated/event-types.md      the same for the event types
#   src/generated/contract-index.json every rule ID in the contract's chapters
#                                     with a hash of its statement, grouped by
#                                     chapter, which the staleness report
#                                     compares between two releases
#   src/generated/marfa-release.json  the latest release tag, shown in the sidebar
#   src/generated/cli-download.md     the macOS install of that release's CLI,
#                                     included by the Quickstart and the CLI page
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

for file in openapi.json GLOSSARY.md core/marfa-cli/COMMANDS.md conformance/spec/errors.md conformance/spec/instance.md conformance/spec/types.md conformance/spec/edges.md conformance/spec/keys-and-oauth.md conformance/spec/events.md; do
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
COMMANDS_DIR="$(mktemp -d "${TMPDIR:-/tmp}/marfa-cli.XXXXXX")"
ERRORS="$(mktemp "${TMPDIR:-/tmp}/marfa-errors.XXXXXX")"
SETTINGS="$(mktemp "${TMPDIR:-/tmp}/marfa-settings.XXXXXX")"
TYPES="$(mktemp "${TMPDIR:-/tmp}/marfa-types.XXXXXX")"
EDGE_TYPES="$(mktemp "${TMPDIR:-/tmp}/marfa-edge-types.XXXXXX")"
PERMISSIONS="$(mktemp "${TMPDIR:-/tmp}/marfa-permissions.XXXXXX")"
EVENT_TYPES="$(mktemp "${TMPDIR:-/tmp}/marfa-event-types.XXXXXX")"
INDEX="$(mktemp "${TMPDIR:-/tmp}/marfa-contract-index.XXXXXX")"
cleanup() { rm -rf "$CANDIDATE" "$OVERVIEW" "$COMMANDS_DIR" "$ERRORS" "$SETTINGS" "$TYPES" "$EDGE_TYPES" "$PERMISSIONS" "$EVENT_TYPES" "$INDEX"; }
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

# The CLI page includes two sections of the command reference, each under a
# heading of its own, so only `## Global options` and `## Exit codes` are
# written, each without its heading line and trimmed. A heading-shaped line inside
# a fence is not a heading. The generated-file comment, the title, the intro and
# every command section are left out. The files go into a temporary directory
# that replaces src/generated/cli only once every other check has passed, so a
# file that is no longer written disappears.
#
# The script says what is wrong itself, because only it knows which section
# failed.
if ! python3 - "$MARFA_ROOT/core/marfa-cli/COMMANDS.md" "$COMMANDS_DIR" <<'PY'
import os, re, sys

source, out_dir = sys.argv[1], sys.argv[2]
FENCE = re.compile(r"\s*(`{3,}|~{3,})")
SECTIONS = {"Global options": "global-options", "Exit codes": "exit-codes"}


def refuse(reason):
    sys.exit(f"{source} {reason}. Nothing has changed.")


def prose(lines):
    """Yield (index, line) for every line outside a fenced block."""
    fence = None
    for i, line in enumerate(lines):
        marker = FENCE.match(line)
        if marker and (fence is None or marker.group(1).startswith(fence)):
            fence = None if fence else marker.group(1)
        elif fence is None:
            yield i, line


try:
    lines = open(source, encoding="utf-8").read().split("\n")
except UnicodeDecodeError:
    refuse("is not UTF-8")

i = 0
while i < len(lines) and not lines[i].strip():
    i += 1
if i < len(lines) and lines[i].lstrip().startswith("<!--"):
    while i < len(lines) and "-->" not in lines[i]:
        i += 1
    if i == len(lines):
        refuse("opens a comment that never closes")
    i += 1
lines = lines[i:]

heads = [(i, line[3:].strip()) for i, line in prose(lines) if line.startswith("## ")]
files = {}
for n, (start, name) in enumerate(heads):
    stem = SECTIONS.get(name)
    if stem is None:
        continue
    if stem in files:
        refuse(f"repeats the section '## {name}'")

    body = lines[start + 1 : heads[n + 1][0] if n + 1 < len(heads) else len(lines)]
    while body and not body[0].strip():
        del body[0]
    while body and not body[-1].strip():
        del body[-1]
    if not body:
        refuse(f"has nothing under '## {name}'")
    files[stem] = "\n".join(body) + "\n"

for name, stem in SECTIONS.items():
    if stem not in files:
        refuse(f"has no '## {name}' section")

for stem, text in files.items():
    with open(os.path.join(out_dir, stem + ".md"), "w", encoding="utf-8") as out:
        out.write(text)
PY
then
  exit 1
fi
chmod 755 "$COMMANDS_DIR"

# Each table is the part of a contract chapter between its two markers, which
# the monorepo's CI holds to what the server defines: the code table to the
# server's list of codes, the settings table to its settings schema, and the
# types, edge types, permissions and event types to the definitions it ships.
# extract_table <chapter> <marker name> <output file> <what the table lists>
extract_table() {
  if ! python3 - "$MARFA_ROOT/conformance/spec/$1" "$2" "$3" <<'PY'
import sys

try:
    text = open(sys.argv[1], encoding="utf-8").read()
except UnicodeDecodeError:
    sys.exit(1)
start, end = f"<!-- {sys.argv[2]}-table:start -->", f"<!-- {sys.argv[2]}-table:end -->"
if text.count(start) != 1 or text.count(end) != 1:
    sys.exit(1)
rest = text.partition(start)[2]
if end not in rest:
    sys.exit(1)
rows = rest.partition(end)[0].strip().splitlines()
if len(rows) < 3 or not all(line.startswith("|") for line in rows):
    sys.exit(1)

with open(sys.argv[3], "w", encoding="utf-8") as out:
    out.write("\n".join(rows) + "\n")
PY
  then
    echo "$MARFA_ROOT/conformance/spec/$1 is not UTF-8 or has no $4 table between its $2-table markers. Nothing has changed." >&2
    exit 1
  fi
}

extract_table errors.md errors "$ERRORS" code
extract_table instance.md settings "$SETTINGS" settings
extract_table types.md types "$TYPES" types
extract_table edges.md edge-types "$EDGE_TYPES" "edge types"
extract_table keys-and-oauth.md permissions "$PERMISSIONS" permissions
extract_table events.md event-types "$EVENT_TYPES" "event types"

# The contract index lists every rule, so a page that cites one can be checked
# against it later. A rule is a level-3 heading holding only its ID, and its
# statement is the text up to the next heading of any level without its Tests
# paragraph: a fixture renamed is not a rule changed. The hash is taken over
# the text with its whitespace collapsed, so rewrapping a paragraph changes
# nothing. README.md only shows how a rule is written and holds no rules.
if ! python3 - "$MARFA_ROOT/conformance/spec" "$INDEX" <<'PY'
import glob, hashlib, json, os, re, sys

spec_dir, out_path = sys.argv[1], sys.argv[2]
heading = re.compile(r"### `([a-z0-9-]+/[a-z0-9-]+)`\s*$")

def statements(text):
    """Yield (id or None, body lines) for each heading-delimited block."""
    current, body, fence = None, [], None
    for line in text.splitlines():
        marker = re.match(r"\s*(`{3,}|~{3,})", line)
        if marker and (fence is None or marker.group(1).startswith(fence)):
            fence = None if fence else marker.group(1)
        elif fence is None and re.match(r"#{1,6} ", line):
            yield current, body
            found = heading.match(line)
            current, body = (found.group(1) if found else None), []
            continue
        body.append(line)
    yield current, body

def digest(body):
    paragraphs = re.split(r"\n\s*\n", "\n".join(body).strip())
    kept = [" ".join(p.split()) for p in paragraphs if not p.lstrip().startswith("**Tests:**")]
    text = " ".join(p for p in kept if p)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]

chapters, seen = {}, set()
for path in sorted(glob.glob(os.path.join(spec_dir, "*.md"))):
    chapter = os.path.basename(path)[:-3]
    if chapter == "README":
        continue
    try:
        text = open(path, encoding="utf-8").read()
    except UnicodeDecodeError:
        sys.exit(1)
    for rule, body in statements(text):
        if rule is None:
            continue
        if rule in seen or rule.split("/")[0] != chapter:
            sys.exit(1)
        seen.add(rule)
        chapters.setdefault(chapter, {})[rule] = digest(body)

if not seen:
    sys.exit(1)
with open(out_path, "w", encoding="utf-8") as out:
    json.dump({"chapters": chapters}, out, indent=2, ensure_ascii=False)
    out.write("\n")
PY
then
  echo "The contract in $MARFA_ROOT/conformance/spec has no rules, a rule ID that repeats or names another chapter, or a chapter that is not UTF-8. Nothing has changed." >&2
  exit 1
fi

cp "$MARFA_ROOT/openapi.json" "$CANDIDATE"
mv "$CANDIDATE" "$SPEC"

mkdir -p "$GENERATED"
mv "$OVERVIEW" "$GENERATED/api-overview.md"
rm -rf "$GENERATED/cli"
mv "$COMMANDS_DIR" "$GENERATED/cli"
mv "$ERRORS" "$GENERATED/error-codes.md"
mv "$SETTINGS" "$GENERATED/settings.md"
mv "$TYPES" "$GENERATED/core-types.md"
mv "$EDGE_TYPES" "$GENERATED/edge-types.md"
mv "$PERMISSIONS" "$GENERATED/permissions.md"
mv "$EVENT_TYPES" "$GENERATED/event-types.md"
mv "$INDEX" "$GENERATED/contract-index.json"
trap - EXIT
cp "$MARFA_ROOT/GLOSSARY.md" "$GENERATED/GLOSSARY.md"
printf '{"version":"%s"}\n' "$RELEASE" > "$GENERATED/marfa-release.json"
# The macOS install the Quickstart and the CLI page include, for the release
# the CLI archive is published with. A release sync changes it with no page edit.
cat > "$GENERATED/cli-download.md" <<DOWNLOAD
\`\`\`bash
curl -fsSL https://github.com/withmarfa/marfa/releases/download/${RELEASE}/marfa-${RELEASE#v}-darwin-arm64.tar.gz | tar -xz
sudo mkdir -p /usr/local/bin
sudo mv marfa /usr/local/bin/
marfa --version
\`\`\`
DOWNLOAD

echo "openapi.json, the API overview, GLOSSARY.md, the CLI's global options and exit codes in src/generated/cli, the error codes, the settings, the type, edge type, permission and event type catalogues, the contract index, the release ($RELEASE) and its CLI download synced from $MARFA_ROOT"
