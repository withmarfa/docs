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
#   src/generated/cli-commands.json   every command of the CLI with its options, read
#                                     from the same file, which the command check
#                                     compares the pages' examples against
#   src/generated/error-codes.md      the contract's table of error codes,
#                                     written from the server's own code list,
#                                     included by the Errors page
#   src/generated/housekeeping.md     the registered housekeeping job table
#   src/generated/settings.md         the contract's table of the instance's
#                                     environment settings, written from the
#                                     server's own setting list, included by
#                                     the Settings guide
#   src/generated/permissions.md      the same for the twelve permissions
#   src/generated/event-types.md      the same for the event types
#   src/generated/contract-index.json every rule ID in the contract's chapters
#                                     with a hash of its statement, grouped by
#                                     chapter, which the staleness report
#                                     compares between two releases
#   src/generated/catalog/            what the Catalog tab lists, replaced whole like
#                                     cli/: builtin-catalog.json (a copy of the
#                                     shipped type catalog), types.md (the
#                                     top-level types, linked to their pages),
#                                     one Markdown file per top-level type with
#                                     its subtypes inside (core.media.md,
#                                     system.folder.md), edges.md, edge-types.md
#                                     (a table of the edge types, with a Source
#                                     types column only if one edge type
#                                     constrains its source),
#                                     the three name lists (reserved-type-roots.md,
#                                     reserved-field-names.md, searched-field-names.md)
#                                     and, from the spec's schemas, item-fields.md,
#                                     edge-fields.md and event-fields.md. The catalog's
#                                     em dashes become colons, as the contract's
#                                     generator writes them.
#   src/generated/marfa-release.json  the latest release tag, shown in the sidebar
#   src/generated/cli-download.md     the macOS install of that release's CLI,
#                                     included by the Quickstart and the CLI page
#   src/generated/server-image.md     the commands that pull that release's server
#                                     image and start it, included by the Deploy
#                                     guide
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

for file in openapi.json GLOSSARY.md core/marfa-cli/COMMANDS.md core/marfa-core/src/builtin_catalog.json conformance/spec/errors.md conformance/spec/housekeeping.md conformance/spec/instance.md conformance/spec/types.md conformance/spec/edges.md conformance/spec/keys-and-oauth.md conformance/spec/events.md; do
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
COMMAND_TREE="$(mktemp "${TMPDIR:-/tmp}/marfa-cli-commands.XXXXXX")"
ERRORS="$(mktemp "${TMPDIR:-/tmp}/marfa-errors.XXXXXX")"
HOUSEKEEPING="$(mktemp "${TMPDIR:-/tmp}/marfa-housekeeping.XXXXXX")"
SETTINGS="$(mktemp "${TMPDIR:-/tmp}/marfa-settings.XXXXXX")"
PERMISSIONS="$(mktemp "${TMPDIR:-/tmp}/marfa-permissions.XXXXXX")"
EVENT_TYPES="$(mktemp "${TMPDIR:-/tmp}/marfa-event-types.XXXXXX")"
INDEX="$(mktemp "${TMPDIR:-/tmp}/marfa-contract-index.XXXXXX")"
CATALOG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/marfa-catalog.XXXXXX")"
cleanup() { rm -rf "$CANDIDATE" "$OVERVIEW" "$COMMANDS_DIR" "$COMMAND_TREE" "$ERRORS" "$HOUSEKEEPING" "$SETTINGS" "$PERMISSIONS" "$EVENT_TYPES" "$INDEX" "$CATALOG_DIR"; }
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

# The command check compares what the pages show with every command and option
# the CLI has, so the whole command tree is written as data: each `### marfa ...`
# section's name, whether it has subcommands or positional arguments, and the
# options in its table. The global options are the table under
# `## Global options`, and the options of `marfa` itself are in the `-V` table
# beside them. A heading-shaped line inside a fence is not a heading, and only
# the first fence of a section, its usage, is read for subcommands and arguments.
if ! python3 - "$MARFA_ROOT/core/marfa-cli/COMMANDS.md" "$COMMAND_TREE" <<'PY'
import json, re, sys

source, out_path = sys.argv[1], sys.argv[2]
FENCE = re.compile(r"\s*(`{3,}|~{3,})")


def refuse(reason):
    sys.exit(f"{source} {reason}. Nothing has changed.")


try:
    lines = re.split(r"\r?\n", open(source, encoding="utf-8").read())
except UnicodeDecodeError:
    refuse("is not UTF-8")

# The sections, with a table or a heading inside a fence taken as text.
fence = None
sections = []  # [heading, [lines outside fences], usage lines]
usage_open = False
for line in lines:
    marker = FENCE.match(line)
    if marker and (fence is None or marker.group(1).startswith(fence)):
        if fence is None:
            fence = marker.group(1)
            usage_open = bool(sections) and sections[-1][2] is None
            if usage_open:
                sections[-1][2] = []
        else:
            fence = None
            usage_open = False
        continue
    if fence is not None:
        if usage_open:
            sections[-1][2].append(line)
        continue
    if line.startswith("## ") or line.startswith("### "):
        sections.append([line, [], None])
    elif sections:
        sections[-1][1].append(line)


def options(body):
    """Option rows of every `| Option |` table in a section's prose."""
    found, in_table = [], False
    for line in body:
        if not line.startswith("|"):
            in_table = False
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells[0] in ("Option", "Argument"):
            in_table = cells[0] == "Option"
            continue
        if not in_table or set(cells[0]) <= set("- "):
            continue
        cell = re.fullmatch(r"`([^`]+)`", cells[0])
        if not cell:
            refuse(f"has an option row this sync cannot read: {line.strip()[:60]}")
        entry = {}
        for part in cell.group(1).split(", "):
            match = re.fullmatch(r"(-[A-Za-z]|--[a-z0-9][a-z0-9-]*)( <[^>]+>)?", part)
            if not match:
                refuse(f"has an option this sync cannot read: {part}")
            if match.group(1).startswith("--"):
                entry["flag"] = match.group(1)
                if match.group(2):
                    entry["value"] = True
            else:
                entry["short"] = match.group(1)
        if "flag" not in entry:
            refuse(f"has an option with no long form: {cell.group(1)}")
        found.append(entry)
    return found


tree = {}
global_options = None
for heading, body, usage in sections:
    if heading == "## Global options":
        # The first table is the options every command takes. A second table
        # in the section is the options of `marfa` alone.
        tables = "\n".join(body).split("`marfa` itself also accepts these.")
        global_options = options(tables[0].split("\n"))
        root = options(tables[1].split("\n")) if len(tables) > 1 else []
        tree[""] = {"options": root, "subcommands": True}
        continue
    match = re.fullmatch(r"### marfa( [a-z0-9][a-z0-9 -]*)", heading)
    if not match:
        continue
    name = match.group(1).strip()
    if name in tree:
        refuse(f"repeats the command '### marfa {name}'")
    usage = [u.split() for u in (usage or []) if u.startswith("marfa ")]
    if not usage:
        refuse(f"gives no usage under '### marfa {name}'")
    words = [w for u in usage for w in u]
    entry = {
        "options": options(body),
        "subcommands": "<COMMAND>" in words,
        "positional": any(
            re.fullmatch(r"[<\[][A-Za-z_]+(\.\.\.)?[>\]](\.\.\.)?", w) and w not in ("<COMMAND>", "[OPTIONS]")
            for w in words
        ),
    }
    tree[name] = {k: v for k, v in entry.items() if v or k == "options"}

if global_options is None:
    refuse("has no '## Global options' section")
if len(tree) < 2:
    refuse("has no '### marfa' command sections")

with open(out_path, "w", encoding="utf-8") as out:
    out.write('{\n "global": ' + json.dumps(global_options) + ',\n "commands": {\n')
    out.write(",\n".join("  " + json.dumps(name) + ": " + json.dumps(entry) for name, entry in tree.items()))
    out.write("\n }\n}\n")
PY
then
  exit 1
fi

# Each table is the part of a contract chapter between its two markers, which
# the monorepo's CI holds to what the server defines: the code table to the
# server's list of codes, the settings table to its settings schema, and the
# permissions and event types to the definitions it ships.
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
extract_table housekeeping.md housekeeping "$HOUSEKEEPING" "housekeeping jobs"
extract_table instance.md settings "$SETTINGS" settings
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

# The Catalog tab lists the shipped types, edge types and the names a type may
# not use, from the monorepo's type catalog, and the shape of an item, an edge
# and an event, from the spec's schemas. Everything goes into a temporary
# directory that replaces src/generated/catalog only once every other check has
# passed, so a file that is no longer written disappears.
#
# The script renders values under labels and writes no explanation of its own;
# what a value means is on the page that includes the file. Descriptions are
# written the way the contract's own generator writes them: an em dash becomes
# a colon, and a pipe inside a table cell is escaped.
#
# The script says what is wrong itself, because only it knows which part of its
# input failed. A shape it does not know is refused rather than left out, so a
# field, key or role the catalog gains cannot go missing from the Catalog
# without someone seeing it here.
if ! python3 - "$MARFA_ROOT/core/marfa-core/src/builtin_catalog.json" "$MARFA_ROOT/openapi.json" "$CATALOG_DIR" <<'PY'
import json, os, re, sys

catalog_path, spec_path, out_dir = sys.argv[1:4]
EM_DASH = chr(0x2014)


def refuse(path, reason):
    sys.exit(f"{path} {reason}. Nothing has changed.")


def plain(text):
    """The contract's generator turns an em dash into a colon. A pair around an aside reads as parentheses."""
    parts = re.split(rf"\s*{EM_DASH}\s*", text)
    if len(parts) == 3:
        return f"{parts[0]} ({parts[1]})" + ("" if parts[2][:1] in ".,;:)" else " ") + parts[2]
    return ": ".join(parts)


def safe(text):
    """Escapes what MDX reads as markup outside a code span: a `<` or a `{`."""
    parts = re.split(r"(`[^`]*`)", text)
    return "".join(part if part.startswith("`") else part.replace("<", "\\<").replace("{", "\\{") for part in parts)


def code(value):
    return f"`{value}`"


def names(values):
    """`a`, `a` and `b`, or `a`, `b` and `c`."""
    quoted = [code(v) for v in values]
    return quoted[0] if len(quoted) == 1 else ", ".join(quoted[:-1]) + " and " + quoted[-1]


def table(header, rows):
    rows = [[safe(plain(cell)).replace("|", "\\|") for cell in row] for row in rows]
    widths = [max(3, len(h), *(len(row[i]) for row in rows)) for i, h in enumerate(header)]

    def line(cells):
        return "| " + " | ".join(cell.ljust(widths[i]) for i, cell in enumerate(cells)) + " |"

    return "\n".join([line(header), "| " + " | ".join("-" * w for w in widths) + " |", *map(line, rows)])


def write(name, lines):
    with open(os.path.join(out_dir, name), "w", encoding="utf-8") as out:
        out.write("\n".join(lines).strip("\n") + "\n")


# The type catalog

FIELD_KEYS = {"type", "label", "description", "required", "format", "enum_values", "items_type", "items_fields", "status_values", "minimum", "maximum"}
MEMBER_KEYS = {"type", "label", "description", "required", "enum_values", "format", "minimum", "maximum"}
TYPE_KEYS = {"id", "parent", "label", "plural", "description", "version", "fields", "display_hints", "merge_policy", "roles"}
EDGE_KEYS = {
    "id", "label", "reverse_label", "description", "cardinality", "source_type_constraints", "target_type_constraints",
    "cascade_on_delete", "reverse_name", "written_at", "property_schema", "shipped", "acyclic", "flat",
}
STRATEGIES = {"last_writer_wins", "keep_both_copies"}
CARDINALITIES = {"one-to-one", "one-to-many", "many-to-one", "many-to-many"}
CASCADES = {"orphan", "cascade", "block", "with-hosts"}
ROLES = {"container"}
HINT_KEYS = ("title_field", "body_field", "icon")
RULES = "/catalog/type-rules"


def kind(field):
    out = code(field["type"])
    if field["type"] == "array":
        out += " of " + code(field["items_type"])
    if "format" in field:
        out += f" ({code(field['format'])})"
    low, high = field.get("minimum"), field.get("maximum")
    if low is not None and high is not None:
        out += f" ({low} to {high})"
    elif low is not None:
        out += f" (at least {low})"
    elif high is not None:
        out += f" (at most {high})"
    return out


def with_values(description, values):
    """An enum's values follow its description, which keeps the Kind column narrow."""
    if not values:
        return description
    return " ".join(p for p in (sentence(description), "Values: " + ", ".join(code(v) for v in values) + ".") if p)


def sentence(text):
    text = text.rstrip()
    return text + "." if text and text[-1] not in ".:;!?" else text


def statuses(values):
    """A status field's words, each with the group it counts in. Where every word is the name of its
    own group, as a task's are, the groups are said once rather than repeated beside each word."""
    if all(v["value"] == v["group"] for v in values):
        return ", ".join(code(v["value"]) for v in values) + ", each in the group of the same name"
    return ", ".join(f"{code(v['value'])} (group {code(v['group'])})" for v in values)


def described(field):
    """The description, then the values an enum or status takes and the label a field declares, as
    values under labels, which keeps the table to three columns."""
    parts = [field["description"]]
    values = values_of(field)
    if values:
        parts.append("Values: " + (statuses(values) if field["type"] == "status" else ", ".join(code(v) for v in values)))
    if "label" in field:
        parts.append("Label: " + field["label"])
    return " ".join(sentence(p) for p in parts if p.strip())


def values_of(field):
    return field.get("enum_values") or field.get("status_values")


def check_fields(owner, fields, allowed):
    if not isinstance(fields, dict) or not fields:
        refuse(catalog_path, f"has no fields for {owner}")
    for name, field in fields.items():
        if not isinstance(field, dict) or not isinstance(field.get("type"), str) or not isinstance(field.get("description"), str):
            refuse(catalog_path, f"has a field {owner}.{name} without a type and a description")
        if not isinstance(field.get("required", False), bool):
            refuse(catalog_path, f"has a field {owner}.{name} whose required is not true or false")
        if set(field) - allowed:
            refuse(catalog_path, f"has a key {sorted(set(field) - allowed)[0]!r} on {owner}.{name} that the sync does not write")
        if field["type"] == "enum" and not field.get("enum_values"):
            refuse(catalog_path, f"has an enum {owner}.{name} without values")
        if field["type"] == "array" and not field.get("items_type"):
            refuse(catalog_path, f"has an array {owner}.{name} without an items_type")
        if "label" in field and not (isinstance(field["label"], str) and field["label"]):
            refuse(catalog_path, f"has a field {owner}.{name} whose label is not a label")
        if field["type"] == "status":
            # A subtype may declare the status field it inherits without its words.
            values = field.get("status_values", [{"value": "inherited", "group": "inherited"}])
            if not isinstance(values, list) or not values or not all(
                isinstance(v, dict) and set(v) == {"value", "group"} and all(isinstance(x, str) and x for x in v.values()) for v in values
            ):
                refuse(catalog_path, f"has a status {owner}.{name} whose status_values are not a list of values and groups")
        elif "status_values" in field:
            refuse(catalog_path, f"has status_values on {owner}.{name}, which is not a status")
        for bound in ("minimum", "maximum"):
            if bound in field and (isinstance(field[bound], bool) or not isinstance(field[bound], (int, float))):
                refuse(catalog_path, f"has a {bound} on {owner}.{name} that is not a number")
        if "items_fields" in field:
            if field["type"] != "array" or field.get("items_type") != "object":
                refuse(catalog_path, f"has items_fields on {owner}.{name}, which is not an array of objects")
            check_fields(f"{owner}.{name}[]", field["items_fields"], MEMBER_KEYS)


def merge_policy_value(owner, policy):
    """The strategy of each named field and the default of the rest, as values."""
    default = policy.get("default")
    named = policy.get("fields", {})
    if default not in STRATEGIES or not isinstance(named, dict) or set(named.values()) - STRATEGIES:
        refuse(catalog_path, f"has a merge policy for {owner} with a strategy the sync does not know")
    parts = []
    for strategy in sorted(STRATEGIES - {default}):
        fields = [n for n, s in named.items() if s == strategy]
        if fields:
            parts.append(f"{code(strategy)} for {names(fields)}")
    parts.append(f"{code(default)} for " + ("every other field" if parts else "every field"))
    return "; ".join(parts)


def hints_of(t):
    hints = t.get("display_hints")
    if hints is None:
        return None
    if not isinstance(hints, dict) or set(hints) - set(HINT_KEYS):
        refuse(catalog_path, f"has display hints for {t['id']} that the sync does not write")
    return hints


def render_types(types):
    by_id = {}
    for t in types:
        if not isinstance(t, dict) or not isinstance(t.get("id"), str) or t["id"] in by_id:
            refuse(catalog_path, "has a type with no id, or one that repeats")
        if set(t) - TYPE_KEYS:
            refuse(catalog_path, f"has a key {sorted(set(t) - TYPE_KEYS)[0]!r} on {t['id']} that the sync does not write")
        for key in ("label", "description"):
            if not isinstance(t.get(key), str):
                refuse(catalog_path, f"has no {key} for {t['id']}")
        check_fields(t["id"], t.get("fields"), FIELD_KEYS)
        if set(t.get("roles", [])) - ROLES:
            refuse(catalog_path, f"has a role on {t['id']} other than container")
        by_id[t["id"]] = t
    for t in types:
        if t.get("parent") is not None and t["parent"] not in by_id:
            refuse(catalog_path, f"names the parent {t['parent']} of {t['id']}, which is not a type in it")
        if t.get("parent") and t["id"].split(".")[0] != t["parent"].split(".")[0]:
            refuse(catalog_path, f"has {t['id']} under a parent in another family")
        seen, step = set(), t
        while step.get("parent"):
            if step["id"] in seen:
                refuse(catalog_path, f"has {t['id']} under a chain of parents that never reaches a top-level type")
            seen.add(step["id"])
            step = by_id[step["parent"]]

    def slug(t):
        """A top-level type's page is its identifier without its family: core.media is /catalog/media."""
        family, _, rest = t["id"].partition(".")
        if not rest or "." in rest:
            refuse(catalog_path, f"has the top-level type {t['id']}, whose identifier is not a family and a name")
        return rest

    def descendants(t):
        out = []
        for child in types:
            if child.get("parent") == t["id"]:
                out += [child, *descendants(child)]
        return out

    def settings(t, parent):
        """The definition's keys other than its fields. A subtype gives only those its parent does not."""
        rows = []
        if t.get("plural") and (parent is None or t["plural"] != parent.get("plural")):
            rows.append([code("plural"), t["plural"]])
        hints, parent_hints = hints_of(t), (hints_of(parent) if parent else None) or {}
        for key in HINT_KEYS:
            # A hint comes from the nearest type that sets it, so a subtype says only the ones it changes.
            if hints is not None and key in hints and hints[key] != parent_hints.get(key):
                rows.append([f"[{code(key)}]({RULES}#display-hints)", code(hints[key])])
        policy = t.get("merge_policy")
        if isinstance(policy, dict) and (parent is None or policy != parent.get("merge_policy")):
            rows.append([f"[{code('merge_policy')}]({RULES}#merge-policy)", merge_policy_value(t["id"], policy)])
        if t.get("roles") and (parent is None or t["roles"] != parent.get("roles")):
            rows.append([f"[{code('roles')}]({RULES}#roles)", ", ".join(code(r) for r in t["roles"])])
        return [table(["Setting", "Value"], rows), ""] if rows else []

    def fields_table(t, parent):
        """A subtype lists only the fields it adds or changes."""
        rows = []
        for n, f in t["fields"].items():
            if parent is not None and parent["fields"].get(n) == f:
                continue
            rows.append((code(n), f))
            # The members of a list of entries follow their field, named as the field's entries are: emails[].value.
            rows += [(code(f"{n}[].{m}"), mf) for m, mf in f.get("items_fields", {}).items()]
        # Whether a field is required is part of its kind, so the table keeps to three columns.
        cells = [[name, kind(f) + (", required" if f.get("required") else ""), described(f)] for name, f in rows]
        return [table(["Field", "Kind", "Description"], cells), ""] if cells else []

    def page(t):
        """A top-level type has a page of its own, whose header gives its label, description and
        identifier, so its file starts with its fields. Its subtypes are sections of it."""
        out = ["## Fields", "", *fields_table(t, None)]
        own = settings(t, None)
        if own:
            out += ["## Settings", "", *own]
        children = descendants(t)
        if children:
            out += ["## Subtypes", ""]
        for child in children:
            parent = by_id[child["parent"]]
            out += [f"### {child['id']} [#{child['id'].replace('.', '-')}]", "", safe(plain(child["description"])), ""]
            out += settings(child, parent) + fields_table(child, parent)
        return out

    top = [t for t in types if not t.get("parent")]
    for t in top:
        write(t["id"] + ".md", page(t))

    # The Catalog's front page: each family's top-level types, linked to their pages, which list
    # their subtypes.
    index = []
    for family, heading in (("core", "Core types"), ("system", "System types")):
        rows = [[f"[{code(t['id'])}](/catalog/{slug(t)})", t["description"]] for t in top if t["id"].split(".")[0] == family]
        if not rows:
            refuse(catalog_path, f"has no top-level {family} type")
        index += [f"## {heading}", "", table(["Type", "Description"], rows), ""]
    if {t["id"].split(".")[0] for t in top} - {"core", "system"}:
        refuse(catalog_path, "has a top-level type outside the core and system families")
    write("types.md", index)


def constraint(edge, key, type_ids):
    """The types an edge type's end takes, in the contract's wording: Any type, Any type with the
    role `container`, or the type itself. Several are joined with "or"."""
    values = edge.get(key)
    if not isinstance(values, list) or not values or not all(isinstance(v, str) for v in values):
        refuse(catalog_path, f"has the edge type {edge['id']} with no {key} list")
    if "*" in values:
        if values != ["*"]:
            refuse(catalog_path, f"has the edge type {edge['id']} with a {key} that mixes * with other entries")
        return "Any type"
    out = []
    for value in values:
        role = value.partition("role:")[2] if value.startswith("role:") else None
        if role is not None and role in ROLES:
            out.append(f"Any type with the role {code(role)}")
        elif role is None and value in type_ids:
            out.append(code(value))
        else:
            refuse(catalog_path, f"has the edge type {edge['id']} with a {key} entry {value!r} that the sync does not write")
    return " or ".join(out)


def edge_table(edges, type_ids):
    """One row for each edge type. The Source types column appears only when some edge type constrains its source.
    The reverse label is the label where an edge type names none, as the API answers it.
    Cardinality and On delete are values, so they are code: a code span keeps `many-to-many` on one line."""
    for e in edges:
        if e.get("cardinality") not in CARDINALITIES:
            refuse(catalog_path, f"has the edge type {e['id']} with a cardinality the sync does not know")
        if e.get("cascade_on_delete") not in CASCADES:
            refuse(catalog_path, f"has the edge type {e['id']} with a cascade_on_delete the sync does not know")
        if "reverse_name" in e and not (isinstance(e["reverse_name"], str) and e["reverse_name"]):
            refuse(catalog_path, f"has the edge type {e['id']} with a reverse_name that is not a name")
        if not (isinstance(e.get("label"), str) and e["label"]):
            refuse(catalog_path, f"has the edge type {e['id']} with no label")
        if "reverse_label" in e and not (isinstance(e["reverse_label"], str) and e["reverse_label"]):
            refuse(catalog_path, f"has the edge type {e['id']} with a reverse_label that is not a label")
    sources = [constraint(e, "source_type_constraints", type_ids) for e in edges]
    targets = [constraint(e, "target_type_constraints", type_ids) for e in edges]
    constrained = any(source != "Any type" for source in sources)
    header = ["Edge type", "Label", "Reverse label", "Reverse name", "Cardinality", "On delete", *(["Source types"] if constrained else []), "Target types"]
    rows = [
        [code(e["id"]), e["label"], e.get("reverse_label", e["label"]), code(e["reverse_name"]) if e.get("reverse_name") else "None", code(e["cardinality"]), code(e["cascade_on_delete"]),
         *([source] if constrained else []), target]
        for e, source, target in zip(edges, sources, targets)
    ]
    return table(header, rows)


def render_edges(edges, type_ids):
    sections = []
    for e in edges:
        if not isinstance(e, dict) or not isinstance(e.get("id"), str) or not isinstance(e.get("description"), str):
            refuse(catalog_path, "has an edge type with no id or description")
        if set(e) - EDGE_KEYS:
            refuse(catalog_path, f"has a key {sorted(set(e) - EDGE_KEYS)[0]!r} on the edge type {e['id']} that the sync does not write")
        if e.get("written_at") not in ("source", "target", "none"):
            refuse(catalog_path, f"has the edge type {e['id']} with a written_at the sync does not know")
        if e["written_at"] == "target" and not e.get("reverse_name"):
            refuse(catalog_path, f"has the edge type {e['id']} written at its target with no reverse_name")
        lines = [f"## {e['id']}", "", safe(plain(e["description"])), ""]
        if e["written_at"] != "source":
            lines += [f"**written_at:** {code(e['written_at'])}", ""]
        for flag in ("acyclic", "flat"):
            if not isinstance(e.get(flag, False), bool):
                refuse(catalog_path, f"has the edge type {e['id']} with an {flag} that is not true or false")
            if e.get(flag):
                lines += [f"**{flag}:** {code('true')}", ""]
        props = e.get("property_schema") or {}
        if props:
            check_fields(f"{e['id']} property", props, FIELD_KEYS)
            rows = [[code(n), kind(f) + (", required" if f.get("required") else ""), described(f)] for n, f in props.items()]
            lines += [table(["Property", "Kind", "Description"], rows), ""]
        sections += lines
    write("edges.md", sections)
    write("edge-types.md", [edge_table(edges, type_ids)])


def render_catalog():
    try:
        catalog = json.load(open(catalog_path, encoding="utf-8"))
    except UnicodeDecodeError:
        refuse(catalog_path, "is not UTF-8")
    except json.JSONDecodeError:
        refuse(catalog_path, "is not valid JSON")
    if not isinstance(catalog, dict):
        refuse(catalog_path, "is not an object")
    types, edges = catalog.get("types"), catalog.get("edge_types")
    if not isinstance(types, list) or not types or not isinstance(edges, list) or not edges:
        refuse(catalog_path, "has no types or no edge_types")
    for key in ("field_types", "reserved_type_roots", "reserved_field_names", "searched_field_names"):
        if not isinstance(catalog.get(key), list) or not catalog[key] or not all(isinstance(v, str) for v in catalog[key]):
            refuse(catalog_path, f"has no {key} list")
    render_types(types)
    render_edges(edges, {t["id"] for t in types if isinstance(t, dict)})
    # Each name list is one paragraph, which the page puts a sentence above.
    for key, stem in (
        ("reserved_type_roots", "reserved-type-roots"),
        ("reserved_field_names", "reserved-field-names"),
        ("searched_field_names", "searched-field-names"),
    ):
        write(stem + ".md", [", ".join(code(v) for v in catalog[key])])
    with open(os.path.join(out_dir, "builtin-catalog.json"), "w", encoding="utf-8") as out, open(catalog_path, encoding="utf-8") as src:
        out.write(src.read())


# The spec's schemas

# An item and an edge have a Catalog section of their own, so a field that
# holds one links there.
LINKS = {"Item": "/catalog/items#fields-every-item-has", "Edge": "/catalog/edges#fields-every-edge-has"}
schemas = {}


def schema(name):
    found = schemas.get(name)
    if not isinstance(found, dict):
        refuse(spec_path, f"has no schema {name}")
    return found


def properties(name):
    props = schema(name).get("properties")
    if not isinstance(props, dict) or not props:
        refuse(spec_path, f"has no properties on the schema {name}")
    return props


def enum_values(node):
    """The values of an enum property, inline or through its reference, or None."""
    if "allOf" in node:
        node = next((p for p in node["allOf"] if "$ref" in p), node["allOf"][0])
    if "$ref" in node:
        name = node["$ref"].rsplit("/", 1)[-1]
        if name in LINKS:
            return None
        node = schema(name)
    return node.get("enum")


def schema_kind(node, enums):
    if "$ref" in node:
        name = node["$ref"].rsplit("/", 1)[-1]
        if name in LINKS:
            return f"[{code(name)}]({LINKS[name]})"
        target = schema(name)
        if "enum" in target and enums:
            return code("enum")
        return code("object") if target.get("type") == "object" else schema_kind(target, enums)
    if "allOf" in node:
        parts = node["allOf"]
        return schema_kind(next((p for p in parts if "$ref" in p), parts[0]), enums)
    if "oneOf" in node:
        return " or ".join(schema_kind(p, enums) for p in node["oneOf"])
    kinds = node.get("type")
    if kinds is None:
        refuse(spec_path, "has a property with no type")
    if isinstance(kinds, list):
        return " or ".join(code(k) for k in kinds)
    if kinds == "array":
        if not isinstance(node.get("items"), dict):
            refuse(spec_path, "has an array property with no items")
        return code("array") + " of " + schema_kind(node["items"], enums)
    if "enum" in node and enums:
        return code("enum")
    return code(kinds)


def describe(node):
    if "allOf" in node:
        wrapped = [p["description"] for p in node["allOf"] if "$ref" not in p and "description" in p]
        if wrapped:
            return wrapped[-1]
    return node.get("description", "")


def rows(props, enums=False, skip=()):
    """With enums, an enum's values follow its description rather than its kind."""
    out = []
    for n, p in props.items():
        if n in skip:
            continue
        kind, values = schema_kind(p, enums), (enum_values(p) if enums else None)
        if enums and code("enum") in kind and not values:
            refuse(spec_path, f"has the property {n}, an enum whose values the sync cannot reach")
        out.append([code(n), kind, with_values(describe(p), values)])
    return out


# The fields every item has, in groups a reader looks for. A field the spec
# gains is refused until it has a group here, so none goes missing.
ITEM_GROUPS = (
    ("Identity", ("id", "type", "tier")),
    ("Content", ("properties", "edges", "extensions")),
    ("Origin", ("source", "source_id", "capture_latitude", "capture_longitude")),
    ("State", ("state", "read_only", "trashed_at", "trashed_by_cascade", "trashed_with")),
    ("Version", ("version", "schema_version")),
    ("Time", ("occurred_at", "created_at", "updated_at")),
)


def item_fields():
    props = properties("Item")
    grouped = {n for _, fields in ITEM_GROUPS for n in fields}
    unknown = sorted(set(props) - grouped)
    if unknown:
        refuse(spec_path, f"has the item field {unknown[0]}, which the sync puts in no group")
    lines = []
    for heading, fields in ITEM_GROUPS:
        present = {n: props[n] for n in fields if n in props}
        if present:
            lines += [f"### {heading}", "", table(["Field", "Kind", "Description"], rows(present, enums=True)), ""]
    return lines


def delivery(name):
    """The properties a webhook body adds to its frame: the allOf member that is not the frame's reference."""
    members = [m for m in schema(name).get("allOf", []) if "$ref" not in m]
    if len(members) != 1 or not isinstance(members[0].get("properties"), dict):
        refuse(spec_path, f"has a webhook schema {name} that is not a frame plus its delivery fields")
    return members[0]["properties"]


def render_spec():
    global schemas
    schemas = json.load(open(spec_path, encoding="utf-8"))["components"]["schemas"]
    header = ["Field", "Kind", "Description"]

    write("item-fields.md", item_fields())
    write("edge-fields.md", [table(header, rows(properties("Edge")))])

    lines = ["## Item event fields", "", table(header, rows(properties("ItemEventFrame"))), ""]
    lines += ["## Edge event fields", "", table(header, rows(properties("EdgeEventFrame"))), ""]
    item_delivery, edge_delivery = delivery("WebhookItemEvent"), delivery("WebhookEdgeEvent")
    if item_delivery == edge_delivery:
        lines += ["## Webhook delivery fields", "", table(header, rows(item_delivery)), ""]
    else:
        lines += ["## Item webhook delivery fields", "", table(header, rows(item_delivery)), ""]
        lines += ["## Edge webhook delivery fields", "", table(header, rows(edge_delivery)), ""]

    # The frames of a stream that are not events, each named by the constant
    # its event_type holds. A frame with no other field is a row with None.
    frames = []
    for name in ("StreamCursorFrame", "StreamLiveFrame", "StreamIncompleteFrame", "CatchupTooOldFrame", "CursorAheadFrame", "ReachChangedFrame"):
        props = properties(name)
        frame = props.get("event_type", {}).get("const")
        if not isinstance(frame, str):
            refuse(spec_path, f"has no event_type constant on the schema {name}")
        own = rows(props, skip=("event_type",))
        frames += [[code(frame), *row] for row in own] or [[code(frame), "None", "", ""]]
    lines += ["## Stream frame fields", "", table(["Frame", "Field", "Kind", "Description"], frames), ""]
    write("event-fields.md", lines)


for stage, path in ((render_catalog, catalog_path), (render_spec, spec_path)):
    try:
        stage()
    except (KeyError, TypeError, ValueError, AttributeError, IndexError, StopIteration) as error:
        what = "is not a type catalog the sync can read" if stage is render_catalog else "does not describe the item, edge and event schemas the sync reads"
        refuse(path, f"{what} ({type(error).__name__}: {error})")
PY
then
  exit 1
fi
chmod 755 "$CATALOG_DIR"

cp "$MARFA_ROOT/openapi.json" "$CANDIDATE"
mv "$CANDIDATE" "$SPEC"

mkdir -p "$GENERATED"
mv "$OVERVIEW" "$GENERATED/api-overview.md"
rm -rf "$GENERATED/cli"
mv "$COMMANDS_DIR" "$GENERATED/cli"
mv "$COMMAND_TREE" "$GENERATED/cli-commands.json"
mv "$ERRORS" "$GENERATED/error-codes.md"
mv "$HOUSEKEEPING" "$GENERATED/housekeeping.md"
mv "$SETTINGS" "$GENERATED/settings.md"
mv "$PERMISSIONS" "$GENERATED/permissions.md"
mv "$EVENT_TYPES" "$GENERATED/event-types.md"
mv "$INDEX" "$GENERATED/contract-index.json"
rm -rf "$GENERATED/catalog"
mv "$CATALOG_DIR" "$GENERATED/catalog"
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
# The server image is tagged with the release without its v. The loopback
# publish is deliberate: Docker publishes a bare port on every interface.
cat > "$GENERATED/server-image.md" <<IMAGE
\`\`\`bash
docker pull ghcr.io/withmarfa/marfa-server:${RELEASE#v}
docker run --name marfa -d --restart unless-stopped -p 127.0.0.1:8600:8600 \\
  -v marfa-data:/data --env-file marfa.env ghcr.io/withmarfa/marfa-server:${RELEASE#v}
\`\`\`
IMAGE

echo "openapi.json, the API overview, GLOSSARY.md, the CLI's global options and exit codes in src/generated/cli, its command tree, the error codes, the housekeeping jobs, the settings, the permission and event type catalogues, the Catalog in src/generated/catalog, the contract index, the release ($RELEASE), its CLI download and its server image commands synced from $MARFA_ROOT"
