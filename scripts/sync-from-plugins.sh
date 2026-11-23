#!/usr/bin/env bash
# Sync what the docs take from the plugins repository, as that repository lists
# its own plugins (scripts/release/plugins.ts): a connector is
# connectors/<name>/plugin/plugin.json, and a common type family is a folder
# types/<name>/ that holds a plugin.json. A folder of types/ with no plugin.json,
# a file of types/ other than README.md, and two folders that name one plugin
# are refused, as that list refuses them.
#
#   src/generated/connectors/connectors.json  the list the docs hold, derived from
#                                             each connector's plugin.json: its
#                                             name, title, description, source,
#                                             mark, types and the types it carries
#                                             back. The build reads it for each
#                                             connector's mark and for the pages
#                                             it must have.
#   src/generated/connectors/source.json      where that list came from: the
#                                             withmarfa/plugins commit and the tag
#                                             that names it, if one does
#   src/generated/connectors/index.md         the connector index: a table of each
#                                             connector's mark, name and what it
#                                             brings in, in the order the sidebar
#                                             lists the pages (by file name)
#   src/generated/connectors/<name>.md        one connector's header: its source,
#                                             its types and whether it carries
#                                             changes back. Its page includes it.
#                                             A connector that is no longer listed
#                                             loses its header.
#   content/docs/catalog/connectors/<name>.mdx  a page for a connector that has
#                                             none, holding only that header, with
#                                             a description and a `job` line
#                                             written from the connector's title
#                                             and source name, not copied from its
#                                             long description. A page that exists
#                                             is never touched. The folder's
#                                             `meta.json` is never touched: with no
#                                             `pages` list the sidebar orders the
#                                             pages by file name.
#   src/generated/plugins/families.json       each family's types, status words,
#                                             guidance and display hints, as the
#                                             plugin declares them
#   src/generated/plugins/<name>.md           one family's header: the family, its
#                                             version (the release tag on the
#                                             commit, without the leading v, or
#                                             none when no tag names it), its types
#                                             with their kinds or groups, status
#                                             words and guidance. Its page includes
#                                             it.
#   src/generated/plugins/index.md            every plugin WithMarfa publishes,
#                                             one row each: a connector, a type
#                                             family, or both. The list gives no
#                                             count.
#   content/docs/catalog/(types)/<name>.mdx   a page for a family that has none,
#                                             holding only that header. A page that
#                                             exists is never touched, and neither
#                                             is the folder's meta.json.
#
# Reads each connector manifest and each family, as committed at HEAD of a
# checkout of withmarfa/plugins, by default the sibling at ../plugins. Set
# MARFA_PLUGINS_ROOT to use another. Nothing is generated or run there: the
# repository's own check keeps each manifest current. A connector carries
# changes back when one of its kinds has the direction `out` or `both`, and it
# carries those kinds' types. A manifest holds no field that says which setting
# turns that off, so the header does not say. The script fetches `origin` and
# stops unless HEAD is the commit of `origin/main`, so a stale or unmerged
# checkout never reaches the docs. To sync a release instead, set
# MARFA_PLUGINS_TAG to its tag: HEAD must be that tag's commit.
#
# `--relink` rewrites only the indexes and the headers, from the lists already
# in src/generated/connectors and src/generated/plugins and the current type
# catalog, and reads no checkout.
# scripts/sync-from-marfa.sh runs it after it writes the catalog, because a type
# links to its Catalog page when the shipped type catalog
# (src/generated/catalog) has one, and a catalog change moves those links.
#
# Everything is checked before anything is written. A checkout with no connector,
# a manifest that is not JSON or of a shape the Catalog does not write, a family
# the plugins list would refuse, and a checkout that is not where it should be,
# stop the script with one line and leave the committed files as they were.

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
FAMILIES="$(mktemp "${TMPDIR:-/tmp}/marfa-plugins-families.XXXXXX")"
MANIFESTS="$(mktemp -u "${TMPDIR:-/tmp}/marfa-plugins-manifests.XXXXXX")"
TYPES_COPY="$(mktemp -d "${TMPDIR:-/tmp}/marfa-plugins-types.XXXXXX")"
OUT="$(mktemp -d "${TMPDIR:-/tmp}/marfa-plugins-out.XXXXXX")"
FAMILY_PAGES="$DOCS_ROOT/content/docs/catalog/(types)"
cleanup() { rm -rf "$LIST" "$OUT" "$MANIFESTS" "$FAMILIES" "$TYPES_COPY"; }
trap cleanup EXIT

COMMIT=""
TAG=""
if [ "$MODE" = relink ]; then
  if [ ! -s "$GENERATED/connectors/connectors.json" ]; then
    echo "No src/generated/connectors/connectors.json to relink. Run scripts/sync-from-plugins.sh first. Nothing has changed." >&2
    exit 1
  fi
  if [ ! -s "$GENERATED/plugins/families.json" ]; then
    echo "No src/generated/plugins/families.json to relink. Run scripts/sync-from-plugins.sh first. Nothing has changed." >&2
    exit 1
  fi
  cp "$GENERATED/connectors/connectors.json" "$LIST"
  cp "$GENERATED/plugins/families.json" "$FAMILIES"
  if [ -s "$GENERATED/connectors/source.json" ]; then
    TAG="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8")).get("tag") or "")' "$GENERATED/connectors/source.json")"
  fi
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

  # Each manifest as committed, never a working copy with edits in it.
  mkdir "$MANIFESTS"
  while IFS= read -r path; do
    folder="${path#connectors/}"
    folder="${folder%%/*}"
    if ! git -C "$PLUGINS_ROOT" show "HEAD:$path" > "$MANIFESTS/$folder.json" 2> /dev/null; then
      echo "Could not read $path in $PLUGINS_ROOT. Nothing has changed." >&2
      exit 1
    fi
  done < <(git -C "$PLUGINS_ROOT" ls-tree -r --name-only HEAD -- connectors | grep -E '^connectors/[^/]+/plugin/plugin\.json$' || true)
  if [ -z "$(ls -A "$MANIFESTS")" ]; then
    echo "No connectors/<name>/plugin/plugin.json committed in $PLUGINS_ROOT. Nothing has changed." >&2
    exit 1
  fi

  # Each family's files as committed, never a working copy with edits in it.
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    dest="$TYPES_COPY/$path"
    mkdir -p "$(dirname "$dest")"
    if ! git -C "$PLUGINS_ROOT" show "HEAD:$path" > "$dest"; then
      echo "Could not read $path in $PLUGINS_ROOT. Nothing has changed." >&2
      exit 1
    fi
  done < <(git -C "$PLUGINS_ROOT" ls-tree -r --name-only HEAD -- types || true)

  if ! python3 - "$MANIFESTS" "$LIST" "$TYPES_COPY" "$FAMILIES" <<'PY'
import json, os, re, sys

manifests, list_path, types_copy, families_path = sys.argv[1:5]


def refuse(reason):
    sys.exit(f"{reason}. Nothing has changed.")


NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MARK = re.compile(r"^(simple-icons|lucide):[a-z0-9]+(-[a-z0-9]+)*$")
TYPE = re.compile(r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$")
connectors = []
for file in sorted(os.listdir(manifests)):
    folder = file[:-5]
    where = f"connectors/{folder}/plugin/plugin.json"
    try:
        manifest = json.load(open(os.path.join(manifests, file), encoding="utf-8"))
    except (ValueError, UnicodeDecodeError):
        refuse(f"{where} is not valid JSON")
    if not isinstance(manifest, dict):
        refuse(f"{where} is not an object")
    for key in ("name", "title", "description"):
        if not isinstance(manifest.get(key), str) or not manifest[key].strip():
            refuse(f"{where} has no {key}")
    if manifest["name"] != folder or not NAME.match(folder):
        refuse(f"{where} is named {manifest['name']}, not for its folder")
    if "mark" in manifest and (not isinstance(manifest["mark"], str) or not MARK.match(manifest["mark"])):
        refuse(f"{where} has a mark that is not a simple-icons or lucide ID")
    section = manifest.get("connector")
    if not isinstance(section, dict):
        refuse(f"{where} has no connector section")
    for key in ("source", "source_name"):
        if not isinstance(section.get(key), str) or not section[key].strip():
            refuse(f"{where} has no connector {key}")
    if not NAME.match(section["source"]):
        refuse(f"{where} has a source that is not lowercase words joined by hyphens")
    kinds = section.get("kinds")
    if not isinstance(kinds, list) or not kinds:
        refuse(f"{where} has no kinds")
    types, carried = [], []
    for kind in kinds:
        if not isinstance(kind, dict) or not isinstance(kind.get("type"), str) or not TYPE.match(kind["type"]):
            refuse(f"{where} has a kind with no type ID")
        if kind.get("direction") not in ("in", "out", "both"):
            refuse(f"{where} has a kind {kind['type']} whose direction is not in, out or both")
        if kind["type"] in types:
            refuse(f"{where} lists {kind['type']} twice")
        types.append(kind["type"])
        if kind["direction"] != "in":
            carried.append(kind["type"])
    entry = {
        "directory": f"connectors/{folder}",
        "name": manifest["name"],
        "title": manifest["title"],
        "description": manifest["description"],
        "source": section["source"],
        "sourceName": section["source_name"],
    }
    if "mark" in manifest:
        entry["mark"] = manifest["mark"]
    entry.update({"types": types, "carriesBack": bool(carried), "carriedTypes": carried})
    connectors.append(entry)
# A common type family, as scripts/release/plugins.ts finds one: a folder of
# types/ with a plugin.json. README.md is the folder's own note. Anything else
# directly in types/ is a family the list cannot see, so it is refused.
PLUGIN_NAME = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$")
EDGE = re.compile(r"^[a-z0-9]+([.-][a-z0-9]+)*$")
VERSION = re.compile(r"^\d+\.\d+\.\d+$")
connector_folders = {c["name"]: c["directory"] + "/plugin" for c in connectors}
families = []
types_root = os.path.join(types_copy, "types")
if os.path.isdir(types_root):
    for entry in sorted(os.listdir(types_root)):
        if entry == "README.md":
            continue
        where = f"types/{entry}"
        folder = os.path.join(types_root, entry)
        if not os.path.isdir(folder):
            refuse(f"{where}: is not a plugin folder")
        if not os.path.isfile(os.path.join(folder, "plugin.json")):
            refuse(f"{where}: holds no plugin.json")
        for child in sorted(os.listdir(folder)):
            if child not in ("plugin.json", "README.md", "types", "edge-types"):
                refuse(f"{where}/{child}: is not part of a plugin")
        manifest_where = f"{where}/plugin.json"
        try:
            manifest = json.load(open(os.path.join(folder, "plugin.json"), encoding="utf-8"))
        except (ValueError, UnicodeDecodeError):
            refuse(f"{manifest_where} is not valid JSON")
        if not isinstance(manifest, dict):
            refuse(f"{manifest_where} is not an object")
        if "version" in manifest:
            refuse(f"{manifest_where} names a version, which a release stamps from its tag")
        unknown = sorted(set(manifest) - {"name", "title", "description", "mark", "maker", "marfa", "connector"})
        if unknown:
            refuse(f"{manifest_where} has {unknown[0]}, which a plugin does not declare")
        for key in ("name", "title", "description", "mark", "maker", "marfa"):
            if not isinstance(manifest.get(key), str) or not manifest[key].strip() or "\n" in manifest[key]:
                refuse(f"{manifest_where} has no {key}")
        if manifest["name"] != entry or not PLUGIN_NAME.match(entry):
            refuse(f"{manifest_where} is named {manifest['name']}, not for its folder")
        if not MARK.match(manifest["mark"]):
            refuse(f"{manifest_where} has a mark that is not a simple-icons or lucide ID")
        if not VERSION.match(manifest["marfa"]):
            refuse(f"{manifest_where} has a marfa that is not a version")
        has_connector = "connector" in manifest
        if has_connector and not isinstance(manifest["connector"], dict):
            refuse(f"{manifest_where} has a connector section that is not an object")
        other = connector_folders.get(manifest["name"])
        if other:
            refuse(f"{where}: names the plugin {manifest['name']}, as {other} does")

        types_dir = os.path.join(folder, "types")
        if not os.path.isdir(types_dir):
            refuse(f"{where}/types: holds no types")
        names = sorted(os.listdir(types_dir))
        json_files = [name for name in names if name.endswith(".json")]
        guidance_files = {name for name in names if name.endswith(".md")}
        for name in names:
            if not name.endswith(".json") and not name.endswith(".md"):
                refuse(f"{where}/types/{name}: is not a type")
        declared = []
        seen_ids = set()
        for name in json_files:
            type_id = name[:-5]
            type_where = f"{where}/types/{name}"
            if type_id + ".md" not in guidance_files:
                refuse(f"{type_where} has no guidance")
            try:
                data = json.load(open(os.path.join(types_dir, name), encoding="utf-8"))
            except (ValueError, UnicodeDecodeError):
                refuse(f"{type_where} is not valid JSON")
            if not isinstance(data, dict):
                refuse(f"{type_where} is not an object")
            unknown = sorted(set(data) - {"id", "label", "description", "version", "parent", "fields", "display_hints"})
            if unknown:
                refuse(f"{type_where} has {unknown[0]}, which a type does not declare")
            if data.get("id") != type_id or not TYPE.match(type_id):
                refuse(f"{type_where} is not the type {data.get('id')}")
            if type_id in seen_ids:
                refuse(f"{where} lists {type_id} twice")
            seen_ids.add(type_id)
            for key in ("label", "description"):
                if not isinstance(data.get(key), str) or not data[key].strip():
                    refuse(f"{type_where} has no {key}")
            parent = data.get("parent")
            if "parent" in data and (not isinstance(parent, str) or not TYPE.match(parent)):
                refuse(f"{type_where} has a parent that is not a type ID")
            if "version" in data and not isinstance(data["version"], int):
                refuse(f"{type_where} has a version that is not a number")
            fields_in = data.get("fields", {})
            if not isinstance(fields_in, dict):
                refuse(f"{type_where} has fields that are not an object")
            fields, status_words = [], []
            for field_name, field in fields_in.items():
                if not isinstance(field, dict) or not isinstance(field.get("type"), str) or not field["type"].strip():
                    refuse(f"{type_where} has a field {field_name} with no kind")
                description = field.get("description", "")
                if not isinstance(description, str):
                    refuse(f"{type_where} has a field {field_name} whose description is not text")
                fields.append({"name": field_name, "type": field["type"], "description": description})
                if field["type"] == "status":
                    values = field.get("status_values")
                    if not isinstance(values, list) or not values:
                        refuse(f"{type_where} has a status {field_name} with no status words")
                    for word in values:
                        if not isinstance(word, dict) or not isinstance(word.get("value"), str) or not word["value"].strip():
                            refuse(f"{type_where} has a status word with no value")
                        if not isinstance(word.get("group"), str) or not word["group"].strip():
                            refuse(f"{type_where} has a status word {word.get('value')} with no group")
                        word_description = word.get("description", "")
                        if not isinstance(word_description, str):
                            refuse(f"{type_where} has a status word {word['value']} whose description is not text")
                        status_words.append({"value": word["value"], "group": word["group"], "description": word_description})
                elif "status_values" in field:
                    refuse(f"{type_where} has status words on {field_name}, which is not a status")
            hints_in = data.get("display_hints", {})
            if not isinstance(hints_in, dict):
                refuse(f"{type_where} has display hints that are not an object")
            hints, mark = {}, None
            for key, value in hints_in.items():
                if not isinstance(value, str) or not value.strip():
                    refuse(f"{type_where} has a display hint {key} that is not text")
                if key == "icon" and not MARK.match(value):
                    refuse(f"{type_where} has an icon that is not a simple-icons or lucide ID")
                if key == "icon":
                    mark = value
                hints[key] = value
            try:
                guidance = open(os.path.join(types_dir, type_id + ".md"), encoding="utf-8").read()
            except UnicodeDecodeError:
                refuse(f"{where}/types/{type_id}.md is not text")
            if not guidance.strip():
                refuse(f"{where}/types/{type_id}.md holds no guidance")
            item = {
                "id": type_id,
                "label": data["label"],
                "description": data["description"],
                "fields": fields,
                "statusWords": status_words,
                "hints": hints,
                "guidance": guidance.strip("\n"),
            }
            if parent:
                item["parent"] = parent
            if mark:
                item["mark"] = mark
            declared.append(item)
        for name in sorted(guidance_files):
            if name[:-3] + ".json" not in json_files:
                refuse(f"{where}/types/{name} has no type")
        if not declared:
            refuse(f"{where} has no types")
        declared.sort(key=lambda item: item["id"])

        edge_types = []
        edge_dir = os.path.join(folder, "edge-types")
        if os.path.isdir(edge_dir):
            for name in sorted(os.listdir(edge_dir)):
                edge_where = f"{where}/edge-types/{name}"
                if not name.endswith(".json"):
                    refuse(f"{edge_where}: is not an edge type")
                edge_id = name[:-5]
                try:
                    data = json.load(open(os.path.join(edge_dir, name), encoding="utf-8"))
                except (ValueError, UnicodeDecodeError):
                    refuse(f"{edge_where} is not valid JSON")
                if not isinstance(data, dict) or data.get("id") != edge_id or not EDGE.match(edge_id):
                    refuse(f"{edge_where} is not the edge type {data.get('id') if isinstance(data, dict) else ''}")
                for key in ("label", "description"):
                    if key in data and not isinstance(data[key], str):
                        refuse(f"{edge_where} has a {key} that is not text")
                ends = {}
                for key, short in (("from_type_constraints", "from"), ("to_type_constraints", "to")):
                    value = data.get(key, [])
                    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
                        refuse(f"{edge_where} has {key} that is not a list of types")
                    ends[short] = value
                edge_types.append({
                    "id": edge_id,
                    "label": data.get("label", ""),
                    "description": data.get("description", ""),
                    "from": ends["from"],
                    "to": ends["to"],
                })

        families.append({
            "directory": where,
            "name": manifest["name"],
            "title": manifest["title"],
            "description": manifest["description"],
            "mark": manifest["mark"],
            "maker": manifest["maker"],
            "marfa": manifest["marfa"],
            "connector": has_connector,
            "types": declared,
            "edgeTypes": edge_types,
        })

json.dump({"schema": 2, "connectors": connectors}, open(list_path, "w", encoding="utf-8"), indent=2)
open(list_path, "a", encoding="utf-8").write("\n")
json.dump({"schema": 1, "families": families}, open(families_path, "w", encoding="utf-8"), indent=2)
open(families_path, "a", encoding="utf-8").write("\n")
PY
  then
    exit 1
  fi
fi

VERSION="$(printf '%s' "$TAG" | python3 -c 'import sys,re; t=sys.stdin.read().strip(); print(t[1:] if re.fullmatch(r"v\d+\.\d+\.\d+", t) else "", end="")')"

if ! python3 - "$LIST" "$GENERATED/catalog/builtin-catalog.json" "$PAGES" "$OUT" "$MODE" "$FAMILIES" "$FAMILY_PAGES" "$VERSION" <<'PY'
import json, os, re, sys

list_path, catalog_path, pages_dir, out, mode, families_path, family_pages, version = sys.argv[1:9]
source = "The list of connectors"


def refuse(reason):
    sys.exit(f"{source} {reason}. Nothing has changed.")


try:
    data = json.load(open(list_path, encoding="utf-8"))
except (ValueError, UnicodeDecodeError):
    refuse("is not valid JSON")
if not isinstance(data, dict) or data.get("schema") != 2:
    refuse("is not schema 2")
connectors = data.get("connectors")
if not isinstance(connectors, list) or not connectors:
    refuse("lists no connectors")

NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MARK = re.compile(r"^(simple-icons|lucide):[a-z0-9]+(-[a-z0-9]+)*$")
TYPE = re.compile(r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$")
seen = set()
for index, c in enumerate(connectors):
    where = f"has connector {index + 1}, which"
    if not isinstance(c, dict):
        refuse(f"{where} is not an object")
    for key in ("name", "title", "description", "source", "sourceName"):
        if not isinstance(c.get(key), str) or not c[key].strip():
            refuse(f"{where} has no {key}")
    if not NAME.match(c["name"]) or not NAME.match(c["source"]):
        refuse(f"has a name or source that is not lowercase words joined by hyphens: {c['name']}")
    if c["name"] in seen:
        refuse(f"lists {c['name']} twice")
    seen.add(c["name"])
    if "mark" in c and (not isinstance(c["mark"], str) or not MARK.match(c["mark"])):
        refuse(f"has a mark for {c['name']} that is not a simple-icons or lucide ID")
    for key in ("types", "carriedTypes"):
        value = c.get(key)
        if not isinstance(value, list) or not all(isinstance(t, str) and TYPE.match(t) for t in value):
            refuse(f"has {key} for {c['name']} that is not a list of type IDs")
    if not isinstance(c.get("carriesBack"), bool):
        refuse(f"has carriesBack for {c['name']} that is not true or false")

# A type links to its Catalog page when the shipped catalog has one: the top-level
# types, at /catalog/<name after the family>. A connector's own types have none.
catalog = json.load(open(catalog_path, encoding="utf-8"))
pages = {t["id"]: "/catalog/" + t["id"].split(".")[1] for t in catalog["types"] if t["id"].count(".") == 1}


def type_ref(type_id):
    return f"[`{type_id}`]({pages[type_id]})" if type_id in pages else f"`{type_id}`"


def cell(text):
    return text.replace("|", "\\|").replace("\n", " ")


# The sidebar orders the pages by file name, so the index does too.
connectors.sort(key=lambda c: c["name"] + ".mdx")

# The index. The mark column holds the mark's ID as code; the build draws the icon
# in its place, and the Markdown copy keeps the ID.
rows = [
    (f"`{c['mark']}`" if "mark" in c else "", f"[{cell(c['title'])}](/catalog/connectors/{c['name']})", cell(c["description"]))
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
        "- **Can carry changes back:** "
        + ("Yes, for " + ", ".join(type_ref(t) for t in c["carriedTypes"]) if c["carriesBack"] and c["carriedTypes"] else "Yes" if c["carriesBack"] else "No"),
    ]
    open(os.path.join(out, c["name"] + ".md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")

# A page for each connector that has none: its header and nothing else, for the
# page's hand-written sections to be added to. Its description and `job` line are
# written from the connector's title and source name, because a connector's own
# description can be longer than a page's limit. Written beside the header files and moved into the content
# folder with them. A relink writes none.
os.makedirs(os.path.join(out, "pages"))
for c in connectors:
    if mode == "relink" or os.path.exists(os.path.join(pages_dir, c["name"] + ".mdx")):
        continue
    name = c["title"]
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


def refuse_families(reason):
    sys.exit(f"The list of type families {reason}. Nothing has changed.")


try:
    held = json.load(open(families_path, encoding="utf-8"))
except (ValueError, UnicodeDecodeError):
    refuse_families("is not valid JSON")
if not isinstance(held, dict) or held.get("schema") != 1 or not isinstance(held.get("families"), list):
    refuse_families("is not schema 1")
families = held["families"]
family_names = set()
for family in families:
    if not isinstance(family, dict) or not isinstance(family.get("name"), str):
        refuse_families("has a family that is not named")
    if family["name"] in seen or family["name"] in family_names:
        refuse_families(f"lists {family['name']}, which is also a connector" if family["name"] in seen else f"lists {family['name']} twice")
    family_names.add(family["name"])
    if not isinstance(family.get("connector"), bool):
        refuse_families(f"has connector for {family['name']} that is not true or false")
    for key in ("title", "description", "mark", "maker", "marfa"):
        if not isinstance(family.get(key), str) or not family[key].strip():
            refuse_families(f"has no {key} for {family['name']}")
    if not isinstance(family.get("types"), list) or not family["types"]:
        refuse_families(f"has no types for {family['name']}")


def aligned(head, rows):
    widths = [max(len(head[i]), *(len(row[i]) for row in rows)) for i in range(len(head))]

    def draw(values):
        return "| " + " | ".join(value.ljust(widths[i]) for i, value in enumerate(values)) + " |"

    lines = [draw(head), "| " + " | ".join("-" * width for width in widths) + " |"] + [draw(row) for row in rows]
    return "\n".join(lines)


def kind_of(declared, item):
    ids = {t["id"] for t in declared}
    is_kind = item.get("parent") in ids
    is_group = any(t.get("parent") == item["id"] for t in declared)
    if is_kind and is_group:
        return "kind, group"
    if is_kind:
        return "kind"
    if is_group:
        return "group"
    return ""


def parent_cell(parent):
    if not parent:
        return ""
    if parent in pages:
        return f"[`{parent}`]({pages[parent]})"
    return f"`{parent}`"


plugin_dir = os.path.join(out, "plugins")
os.makedirs(plugin_dir)
version_text = version or "none"
for family in families:
    declared = sorted(family["types"], key=lambda item: item["id"])
    parts = ["\n".join([
        f"- **Family:** {family['title']} (`{family['name']}`)",
        f"- **Version:** {version_text}",
        f"- **Mark:** `{family['mark']}`",
        f"- **Maker:** {family['maker']}",
        f"- **Oldest Marfa:** {family['marfa']}",
        f"- **Description:** {family['description']}",
    ])]
    parts.append("## Types\n\n" + aligned(
        ("Type", "Label", "Kind or group", "Parent", "Mark", "Description"),
        [(
            f"`{item['id']}`",
            cell(item["label"]),
            kind_of(declared, item),
            parent_cell(item.get("parent")),
            f"`{item['mark']}`" if item.get("mark") else "",
            cell(item["description"]),
        ) for item in declared],
    ))
    field_rows = [
        (f"`{item['id']}`", f"`{field['name']}`", f"`{field['type']}`", cell(field.get("description", "")))
        for item in declared for field in item.get("fields", [])
    ]
    if field_rows:
        parts.append("## Fields\n\n" + aligned(("Type", "Field", "Kind", "Description"), field_rows))
    word_rows = [
        (f"`{item['id']}`", f"`{word['value']}`", f"`{word['group']}`", cell(word.get("description", "")))
        for item in declared for word in item.get("statusWords", [])
    ]
    if word_rows:
        parts.append("## Status words\n\n" + aligned(("Type", "Word", "Group", "Description"), word_rows))
    hint_rows = [
        (f"`{item['id']}`", f"`{key}`", f"`{value}`")
        for item in declared for key, value in item.get("hints", {}).items() if key != "icon"
    ]
    if hint_rows:
        parts.append("## Display hints\n\n" + aligned(("Type", "Hint", "Value"), hint_rows))
    edge_rows = [
        (
            f"`{edge['id']}`",
            cell(edge.get("label", "")),
            ", ".join(f"`{name}`" for name in edge.get("from", [])),
            ", ".join(f"`{name}`" for name in edge.get("to", [])),
            cell(edge.get("description", "")),
        )
        for edge in family.get("edgeTypes", [])
    ]
    if edge_rows:
        parts.append("## Edge types\n\n" + aligned(("Edge type", "Label", "From", "To", "Description"), edge_rows))
    parts.append("## Guidance\n\n" + "\n\n".join(
        f"### `{item['id']}`\n\n{item['guidance'].strip()}" for item in declared
    ))
    open(os.path.join(plugin_dir, family["name"] + ".md"), "w", encoding="utf-8").write("\n\n".join(parts) + "\n")

listed = []
for c in connectors:
    listed.append((c["name"], (
        f"`{c['mark']}`" if "mark" in c else "",
        f"[{cell(c['title'])}](/catalog/connectors/{c['name']})",
        "Connector",
        cell(c["description"]),
    )))
for family in families:
    listed.append((family["name"], (
        f"`{family['mark']}`" if family.get("mark") else "",
        f"[{cell(family['title'])}](/catalog/{family['name']})",
        "Both" if family["connector"] else "Type family",
        cell(family["description"]),
    )))
listed.sort(key=lambda item: item[0] + ".mdx")
open(os.path.join(plugin_dir, "index.md"), "w", encoding="utf-8").write(
    aligned(("Mark", "Plugin", "What it is", "Brings in"), [row for _, row in listed]) + "\n"
)

# A page for each family that has none. A relink writes none, and a page that
# exists is left to the person writing it. The folder's meta.json is not touched.
os.makedirs(os.path.join(out, "family-pages"))
for family in families:
    if mode == "relink" or os.path.exists(os.path.join(family_pages, family["name"] + ".mdx")):
        continue
    name = family["title"]
    description = f"The types the {name} plugin adds."
    job = f"A reader considering {name} learns which types the plugin adds, and their status words and guidance."
    page = (
        "---\n"
        f"title: {json.dumps(name)}\n"
        f"description: {json.dumps(description)}\n"
        f"job: {json.dumps(job)}\n"
        "---\n\n"
        f"<include cwd>src/generated/plugins/{family['name']}.md</include>\n"
    )
    open(os.path.join(out, "family-pages", family["name"] + ".mdx"), "w", encoding="utf-8").write(page)
PY
then
  exit 1
fi

mkdir -p "$GENERATED/connectors" "$GENERATED/plugins"
if [ "$MODE" = relink ]; then
  rm -f "$GENERATED"/connectors/*.md
  for file in "$OUT"/*.md; do
    mv "$file" "$GENERATED/connectors/"
  done
  rm -f "$GENERATED"/plugins/*.md
  for file in "$OUT"/plugins/*.md; do
    [ -e "$file" ] || continue
    mv "$file" "$GENERATED/plugins/"
  done
  echo "the connectors' and type families' indexes and headers, linked against the current type catalog"
  exit 0
fi

mkdir -p "$PAGES" "$FAMILY_PAGES"
rm -rf "$GENERATED/connectors" "$GENERATED/plugins"
mkdir "$GENERATED/connectors" "$GENERATED/plugins"
cp "$LIST" "$GENERATED/connectors/connectors.json"
cp "$FAMILIES" "$GENERATED/plugins/families.json"
python3 - "$COMMIT" "$TAG" > "$GENERATED/connectors/source.json" <<'PY'
import json, sys

commit, tag = sys.argv[1:3]
print(json.dumps({"repository": "withmarfa/plugins", "commit": commit, "tag": tag or None}, indent=2))
PY
for file in "$OUT"/*.md; do
  mv "$file" "$GENERATED/connectors/"
done
for file in "$OUT"/plugins/*.md; do
  [ -e "$file" ] || continue
  mv "$file" "$GENERATED/plugins/"
done
for file in "$OUT"/pages/*.mdx; do
  [ -e "$file" ] || continue
  mv "$file" "$PAGES/"
done
for file in "$OUT"/family-pages/*.mdx; do
  [ -e "$file" ] || continue
  mv "$file" "$FAMILY_PAGES/"
done

echo "the connectors' list, its source (${TAG:-$COMMIT}), index and headers, the type families' headers and the plugin list, and a page for each connector or family without one, synced from $PLUGINS_ROOT"
