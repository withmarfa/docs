#!/usr/bin/env bash
# Sync what the docs take from the plugins repository's generated list of connectors:
#   src/generated/connectors/connectors.json  a copy of the list, which the build
#                                             reads for each connector's mark and
#                                             for the pages it must have
#   src/generated/connectors/source.json      where that copy came from: the
#                                             withmarfa/plugins commit and the tag
#                                             that names it, if one does
#   src/generated/connectors/index.md         the connector index: a table of each
#                                             connector's mark, name and what it
#                                             brings in, in the order the sidebar
#                                             lists the pages (by file name)
#   src/generated/connectors/<name>.md        one connector's header: its source,
#                                             its types, whether it carries
#                                             changes back and whether that can be
#                                             turned off. Its page includes it.
#                                             A connector that is no longer listed
#                                             loses its header.
#   content/docs/catalog/connectors/<name>.mdx  a page for a connector that has
#                                             none, holding only that header, with
#                                             a description and a `job` line
#                                             written from the list's fields, not
#                                             copied from its long description. A
#                                             page that exists is never touched.
#                                             The folder's `meta.json` is never
#                                             touched: with no `pages` list the
#                                             sidebar orders the pages by file name.
#
# Reads the committed `connectors.json` at HEAD of a checkout of
# withmarfa/plugins, by default the sibling at ../plugins. Set
# MARFA_PLUGINS_ROOT to use another. Nothing is generated or run there: the
# repository's own check keeps the list current. The script fetches `origin`
# and stops unless HEAD is the commit of `origin/main`, so a stale or
# unmerged checkout never reaches the docs. To sync a release instead, set
# MARFA_PLUGINS_TAG to its tag: HEAD must be that tag's commit.
#
# `--relink` rewrites only the index and the headers, from the copy already in
# src/generated/connectors and the current type catalog, and reads no checkout.
# scripts/sync-from-marfa.sh runs it after it writes the catalog, because a type
# links to its Catalog page when the shipped type catalog
# (src/generated/catalog) has one, and a catalog change moves those links.
#
# Everything is checked before anything is written. A list that is missing, not
# JSON or of a shape the Catalog does not write, and a checkout that is not where
# it should be, stop the script with one line and leave the committed files as
# they were.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_ROOT="$(dirname "$SCRIPT_DIR")"
PLUGINS_ROOT="${MARFA_PLUGINS_ROOT:-$DOCS_ROOT/../plugins}"
GENERATED="$DOCS_ROOT/src/generated"
PAGES="$DOCS_ROOT/content/docs/catalog/connectors"

MODE=sync
case "${1:-}" in
  "") ;;
  --relink) MODE=relink ;;
  *)
    echo "Unknown argument: $1. The only one is --relink." >&2
    exit 1
    ;;
esac

if [ ! -s "$GENERATED/catalog/builtin-catalog.json" ]; then
  echo "No src/generated/catalog/builtin-catalog.json. Run scripts/sync-from-marfa.sh first. Nothing has changed." >&2
  exit 1
fi

LIST="$(mktemp "${TMPDIR:-/tmp}/marfa-plugins.XXXXXX")"
OUT="$(mktemp -d "${TMPDIR:-/tmp}/marfa-plugins-out.XXXXXX")"
cleanup() { rm -rf "$LIST" "$OUT"; }
trap cleanup EXIT

COMMIT=""
TAG=""
if [ "$MODE" = relink ]; then
  if [ ! -s "$GENERATED/connectors/connectors.json" ]; then
    echo "No src/generated/connectors/connectors.json to relink. Run scripts/sync-from-plugins.sh first. Nothing has changed." >&2
    exit 1
  fi
  cp "$GENERATED/connectors/connectors.json" "$LIST"
else
  if [ ! -d "$PLUGINS_ROOT" ]; then
    echo "The plugins repository was not found at $PLUGINS_ROOT. Set MARFA_PLUGINS_ROOT to its path." >&2
    exit 1
  fi

  # The committed list, never a working copy with edits in it.
  if ! git -C "$PLUGINS_ROOT" rev-parse --git-dir > /dev/null 2>&1; then
    echo "Not a git checkout: $PLUGINS_ROOT. Nothing has changed." >&2
    exit 1
  fi

  # The checkout must be the commit the list is published at, never a branch
  # that is behind, ahead or unmerged. The check reads origin as it is now.
  if ! git -C "$PLUGINS_ROOT" fetch --quiet --tags origin 2> /dev/null; then
    echo "Could not fetch origin in $PLUGINS_ROOT, so it cannot be checked against origin/main. Nothing has changed." >&2
    exit 1
  fi
  COMMIT="$(git -C "$PLUGINS_ROOT" rev-parse --verify HEAD 2> /dev/null || true)"
  if [ -n "${MARFA_PLUGINS_TAG:-}" ]; then
    WANTED="$(git -C "$PLUGINS_ROOT" rev-parse --verify --quiet "refs/tags/${MARFA_PLUGINS_TAG}^{commit}" || true)"
    if [ -z "$WANTED" ]; then
      echo "No tag ${MARFA_PLUGINS_TAG} in $PLUGINS_ROOT. Nothing has changed." >&2
      exit 1
    fi
    if [ "$COMMIT" != "$WANTED" ]; then
      echo "$PLUGINS_ROOT is not at ${MARFA_PLUGINS_TAG}: check out the tag. Nothing has changed." >&2
      exit 1
    fi
    TAG="$MARFA_PLUGINS_TAG"
  else
    WANTED="$(git -C "$PLUGINS_ROOT" rev-parse --verify --quiet refs/remotes/origin/main || true)"
    if [ -z "$WANTED" ]; then
      echo "$PLUGINS_ROOT has no origin/main to check against. Nothing has changed." >&2
      exit 1
    fi
    if [ "$COMMIT" != "$WANTED" ]; then
      echo "$PLUGINS_ROOT is not at origin/main: check out an up-to-date main, or set MARFA_PLUGINS_TAG to sync a tag. Nothing has changed." >&2
      exit 1
    fi
    # The release tag that names this commit, if there is one.
    TAG="$(git -C "$PLUGINS_ROOT" tag --points-at HEAD --list 'v[0-9]*' | sort -V | tail -n 1)"
  fi

  if ! git -C "$PLUGINS_ROOT" show HEAD:connectors.json > "$LIST" 2> /dev/null || [ ! -s "$LIST" ]; then
    echo "No committed connectors.json in $PLUGINS_ROOT. Nothing has changed." >&2
    exit 1
  fi
fi

if ! python3 - "$LIST" "$GENERATED/catalog/builtin-catalog.json" "$PAGES" "$OUT" "$MODE" <<'PY'
import json, os, re, sys

list_path, catalog_path, pages_dir, out, mode = sys.argv[1:6]
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


# The sidebar orders the pages by file name, so the index does too: that puts
# readwise-reader before readwise, which sorting the bare names would not.
connectors.sort(key=lambda c: c["name"] + ".mdx")

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
# page's hand-written sections to be added to. Its description and `job` line are
# written from the list's fields, because a connector's own description can be longer
# than a page's limit. Written beside the header files and moved into the content
# folder with them. A relink writes none.
os.makedirs(os.path.join(out, "pages"))
for c in connectors:
    if mode == "relink" or os.path.exists(os.path.join(pages_dir, c["name"] + ".mdx")):
        continue
    name = title(c)
    description = f"The source, the types and what carries back for the {name} connector."
    job = f"A reader considering {name} learns which types the connector brings in and whether it carries changes back to {c['sourceName']}."
    page = (
        "---\n"
        f"title: {json.dumps(name)}\n"
        f"description: {json.dumps(description)}\n"
        f"job: {json.dumps(job)}\n"
        "---\n\n"
        f"<include cwd>src/generated/connectors/{c['name']}.md</include>\n"
    )
    open(os.path.join(out, "pages", c["name"] + ".mdx"), "w", encoding="utf-8").write(page)
PY
then
  exit 1
fi

mkdir -p "$GENERATED/connectors"
if [ "$MODE" = relink ]; then
  rm -f "$GENERATED"/connectors/*.md
  for file in "$OUT"/*.md; do
    mv "$file" "$GENERATED/connectors/"
  done
  echo "the connectors' index and headers in src/generated/connectors, linked against the current type catalog"
  exit 0
fi

mkdir -p "$PAGES"
rm -rf "$GENERATED/connectors"
mkdir "$GENERATED/connectors"
cp "$LIST" "$GENERATED/connectors/connectors.json"
python3 - "$COMMIT" "$TAG" > "$GENERATED/connectors/source.json" <<'PY'
import json, sys

commit, tag = sys.argv[1:3]
print(json.dumps({"repository": "withmarfa/plugins", "commit": commit, "tag": tag or None}, indent=2))
PY
for file in "$OUT"/*.md; do
  mv "$file" "$GENERATED/connectors/"
done
for file in "$OUT"/pages/*.mdx; do
  [ -e "$file" ] || continue
  mv "$file" "$PAGES/"
done

echo "the connectors' list, its source (${TAG:-$COMMIT}), index and headers in src/generated/connectors, and a page for each connector without one, synced from $PLUGINS_ROOT"
