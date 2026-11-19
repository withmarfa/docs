#!/usr/bin/env bash
# Sync what the docs take from marfa-connectors' generated list of connectors:
#   src/generated/connectors/connectors.json  a copy of the list, which the build
#                                             reads for each connector's mark and
#                                             for the pages it must have
#   src/generated/connectors/index.md         the connector index: a table of each
#                                             connector's mark, name and what it
#                                             brings in, ordered by name
#   src/generated/connectors/<name>.md        one connector's header: its source,
#                                             its types, whether it carries
#                                             changes back and whether that can be
#                                             turned off. Its page includes it.
#                                             The directory is replaced whole, so
#                                             a connector that is no longer listed
#                                             disappears.
#   content/docs/catalog/connectors/<name>.mdx  a page for a connector that has
#                                             none, holding only that header. A
#                                             page that exists is never touched.
#   content/docs/catalog/connectors/meta.json  its `pages`, set to every connector's
#                                             name in order, so the sidebar lists
#                                             them as the index does. Its other
#                                             keys are kept.
#
# Reads the committed `connectors.json` at HEAD of a checkout of
# marfa-connectors, by default the sibling at ../marfa-connectors. Set
# MARFA_CONNECTORS_ROOT to use another. Nothing is generated or run there: the
# repository's own check keeps the list current, so the checkout should be on an
# up-to-date main. A type links to its Catalog page when the shipped type catalog
# (src/generated/catalog, from scripts/sync-from-marfa.sh) has one.
#
# Everything is checked before anything is written. A list that is missing, not
# JSON or of a shape the Catalog does not write stops the script with one line
# and leaves the committed files as they were.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_ROOT="$(dirname "$SCRIPT_DIR")"
CONNECTORS_ROOT="${MARFA_CONNECTORS_ROOT:-$DOCS_ROOT/../marfa-connectors}"
GENERATED="$DOCS_ROOT/src/generated"
PAGES="$DOCS_ROOT/content/docs/catalog/connectors"

if [ ! -d "$CONNECTORS_ROOT" ]; then
  echo "marfa-connectors not found at $CONNECTORS_ROOT. Set MARFA_CONNECTORS_ROOT to its path." >&2
  exit 1
fi

# The committed list, never a working copy with edits in it.
if ! git -C "$CONNECTORS_ROOT" rev-parse --git-dir > /dev/null 2>&1; then
  echo "Not a git checkout: $CONNECTORS_ROOT. Nothing has changed." >&2
  exit 1
fi

if [ ! -s "$GENERATED/catalog/builtin-catalog.json" ]; then
  echo "No src/generated/catalog/builtin-catalog.json. Run scripts/sync-from-marfa.sh first. Nothing has changed." >&2
  exit 1
fi

LIST="$(mktemp "${TMPDIR:-/tmp}/marfa-connectors.XXXXXX")"
OUT="$(mktemp -d "${TMPDIR:-/tmp}/marfa-connectors-out.XXXXXX")"
cleanup() { rm -rf "$LIST" "$OUT"; }
trap cleanup EXIT

if ! git -C "$CONNECTORS_ROOT" show HEAD:connectors.json > "$LIST" 2> /dev/null || [ ! -s "$LIST" ]; then
  echo "No committed connectors.json in $CONNECTORS_ROOT. Nothing has changed." >&2
  exit 1
fi

if ! python3 - "$LIST" "$GENERATED/catalog/builtin-catalog.json" "$PAGES" "$OUT" <<'PY'
import json, os, re, sys

list_path, catalog_path, pages_dir, out = sys.argv[1:5]
source = "connectors.json"


def refuse(reason):
    sys.exit(f"{source} {reason}. Nothing has changed.")


try:
    data = json.load(open(list_path, encoding="utf-8"))
except (ValueError, UnicodeDecodeError):
    refuse("is not valid JSON")
if not isinstance(data, dict) or data.get("schema") != 1:
    refuse("is not schema 1")
connectors = data.get("connectors")
if not isinstance(connectors, list) or not connectors:
    refuse("lists no connectors")

NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MARK = re.compile(r"^simple-icons:[a-z0-9]+(-[a-z0-9]+)*$")
TYPE = re.compile(r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$")
seen = set()
for index, c in enumerate(connectors):
    where = f"has connector {index + 1}, which"
    if not isinstance(c, dict):
        refuse(f"{where} is not an object")
    for key in ("name", "description", "source", "sourceName"):
        if not isinstance(c.get(key), str) or not c[key].strip():
            refuse(f"{where} has no {key}")
    if not NAME.match(c["name"]) or not NAME.match(c["source"]):
        refuse(f"has a name or source that is not lowercase words joined by hyphens: {c['name']}")
    if c["name"] in seen:
        refuse(f"lists {c['name']} twice")
    seen.add(c["name"])
    if "sourceMark" in c and (not isinstance(c["sourceMark"], str) or not MARK.match(c["sourceMark"])):
        refuse(f"has a sourceMark for {c['name']} that is not a simple-icons ID")
    for key in ("types", "carriedTypes"):
        value = c.get(key)
        if not isinstance(value, list) or not all(isinstance(t, str) and TYPE.match(t) for t in value):
            refuse(f"has {key} for {c['name']} that is not a list of type IDs")
    for key in ("carriesBack", "carriesBackCanBeTurnedOff"):
        if not isinstance(c.get(key), bool):
            refuse(f"has {key} for {c['name']} that is not true or false")

# A type links to its Catalog page when the shipped catalog has one: the top-level
# types, at /catalog/<name after the family>. A connector's own types have none.
catalog = json.load(open(catalog_path, encoding="utf-8"))
pages = {t["id"]: "/catalog/" + t["id"].split(".")[1] for t in catalog["types"] if t["id"].count(".") == 1}


def type_ref(type_id):
    return f"[`{type_id}`]({pages[type_id]})" if type_id in pages else f"`{type_id}`"


def title(c):
    if c["name"] == c["source"]:
        return c["sourceName"]
    prefix = c["source"] + "-"
    if c["name"].startswith(prefix):
        rest = c["name"][len(prefix):]
        return c["sourceName"] + " " + " ".join(w.capitalize() for w in rest.split("-"))
    return " ".join(w.capitalize() for w in c["name"].split("-"))


def cell(text):
    return text.replace("|", "\\|").replace("\n", " ")


connectors.sort(key=lambda c: c["name"])

# The index. The mark column holds the mark's ID as code; the build draws the icon
# in its place, and the Markdown copy keeps the ID.
rows = [
    (f"`{c['sourceMark']}`" if "sourceMark" in c else "", f"[{cell(title(c))}](/catalog/connectors/{c['name']})", cell(c["description"]))
    for c in connectors
]
head = ("Mark", "Connector", "Brings in")
widths = [max(len(head[i]), *(len(r[i]) for r in rows)) for i in range(3)]


def line(values):
    return "| " + " | ".join(v.ljust(widths[i]) for i, v in enumerate(values)) + " |"


table = [line(head), "| " + " | ".join("-" * w for w in widths) + " |"] + [line(r) for r in rows]
open(os.path.join(out, "index.md"), "w", encoding="utf-8").write("\n".join(table) + "\n")

for c in connectors:
    lines = [
        f"- **Source:** `{c['source']}`, shown as {c['sourceName']}",
        "- **Types:** " + ", ".join(type_ref(t) for t in c["types"]),
        "- **Carries changes back:** "
        + ("Yes, for " + ", ".join(type_ref(t) for t in c["carriedTypes"]) if c["carriesBack"] and c["carriedTypes"] else "Yes" if c["carriesBack"] else "No"),
    ]
    if c["carriesBack"]:
        lines.append("- **Can be turned off:** " + ("Yes" if c["carriesBackCanBeTurnedOff"] else "No"))
    open(os.path.join(out, c["name"] + ".md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")

# A page for each connector that has none: its header and nothing else, for the
# page's hand-written sections to be added to. Written beside the header files and
# moved into the content folder with them.
os.makedirs(os.path.join(out, "pages"))
for c in connectors:
    if os.path.exists(os.path.join(pages_dir, c["name"] + ".mdx")):
        continue
    page = (
        "---\n"
        f"title: {json.dumps(title(c))}\n"
        f"description: {json.dumps(c['description'])}\n"
        "---\n\n"
        f"<include cwd>src/generated/connectors/{c['name']}.md</include>\n"
    )
    open(os.path.join(out, "pages", c["name"] + ".mdx"), "w", encoding="utf-8").write(page)

# The sidebar lists the connectors as the index does, by name.
meta_path = os.path.join(pages_dir, "meta.json")
meta = json.load(open(meta_path, encoding="utf-8")) if os.path.exists(meta_path) else {"title": "Connectors", "defaultOpen": False}
meta["pages"] = [c["name"] for c in connectors]
open(os.path.join(out, "pages", "meta.json"), "w", encoding="utf-8").write(json.dumps(meta, indent=2) + "\n")
PY
then
  exit 1
fi

mkdir -p "$GENERATED" "$PAGES"
rm -rf "$GENERATED/connectors"
mkdir "$GENERATED/connectors"
cp "$LIST" "$GENERATED/connectors/connectors.json"
for file in "$OUT"/*.md; do
  mv "$file" "$GENERATED/connectors/"
done
for file in "$OUT"/pages/*.mdx "$OUT"/pages/meta.json; do
  [ -e "$file" ] || continue
  mv "$file" "$PAGES/"
done

echo "the connectors' list, index and headers in src/generated/connectors, and a page for each connector without one, and the sidebar order, synced from $CONNECTORS_ROOT"
