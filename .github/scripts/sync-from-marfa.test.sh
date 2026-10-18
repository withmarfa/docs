#!/usr/bin/env bash
# Runs scripts/sync-from-marfa.sh against throwaway checkouts of the docs and of
# the monorepo, and pins what it writes and when it refuses.
#
# The parts that need a test are the files the script rewrites rather than
# copies. It turns the spec's info.description into
# src/generated/api-overview.md, moving each heading down a level, and takes the
# command reference's global options and exit codes, each without its heading,
# into src/generated/cli/global-options.md and exit-codes.md and nothing else
# from it, and it takes the code table from the errors chapter into
# src/generated/error-codes.md and the settings table from the instance chapter
# into src/generated/settings.md, the tables of the shipped edge types,
# permissions and event types from their chapters into src/generated/edge-types.md,
# permissions.md and event-types.md, and it hashes every rule of
# the contract's chapters into src/generated/contract-index.json. It writes the
# Catalog's files into src/generated/catalog, replaced whole: a Markdown file per
# top-level type from the monorepo's type catalog, with its subtypes inside, an
# index of those types, the
# edge types, three name lists, and the item, edge and event fields from the
# spec's schemas. A description
# that is missing, blank or the wrong type, a spec whose top level or `info` is
# not an object, or a command reference that is missing, empty, not UTF-8, with a
# comment that never closes, without its global options or exit codes, or with
# either repeated or empty, or a chapter with no table between its markers, or a
# contract with no rules, a repeated rule ID or an ID under another chapter, must
# stop the script before it changes anything, with one line saying so, never a
# Python traceback, and so must a type catalog that is missing, not JSON, or of a
# shape the Catalog does not write, and a spec without the schemas it reads. The
# script is copied into each fixture so that its docs root
# is the fixture, and the real tree is never touched.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="${here}/../../scripts/sync-from-marfa.sh"

pass=0; fail=0
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then pass=$((pass+1)); printf '  ok    %s\n' "$1"
  else fail=$((fail+1)); printf '  FAIL  %s: expected %s, got %s\n' "$1" "$2" "$(printf '%s' "$3" | head -c 200)"; fi
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
# The script's own temporary files and folders go here, so that one left behind
# can be seen at the end.
mkdir "${work}/tmp"

# The command reference every fixture holds: the generated-file comment, the
# title, the intro, the global options, the exit codes with a fenced block whose
# lines look like headings, and three commands (status, owner and search). A real
# reference has the commands, and the script must write nothing from them. The
# two files it writes follow.
commands="$(cat <<'EOF'
<!-- Generated from the command tree. Do not edit by hand. -->

# Command reference

Marfa from the command line.

## Global options

Every command accepts these.

| Option | Description |
| --- | --- |
| `--json` | Print the answer as JSON. |

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Done. |

With --json a refusal is one JSON object on stderr:

```text
# not a heading
## not a section
{"exit":N}
```

## status

What the instance says about itself.

### marfa status

```text
# not a heading either
marfa status [OPTIONS]
```

## owner

The owner, the one account behind the sign-in surface.

### marfa owner

```text
marfa owner [OPTIONS] <COMMAND>
```

### marfa owner show

Show the owner.

```text
marfa owner show [OPTIONS]
```

### marfa owner recover

Recover the password.

```text
marfa owner recover [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--stdin` | Read the password from standard input. |

## search

Search the instance.

### marfa search items

```text
marfa search items [OPTIONS] <QUERY>
```

EOF
)"
cli_global_expected="$(cat <<'EOF'
Every command accepts these.

| Option | Description |
| --- | --- |
| `--json` | Print the answer as JSON. |
EOF
)"
cli_exit_expected="$(cat <<'EOF'
| Code | Meaning |
| --- | --- |
| 0 | Done. |

With --json a refusal is one JSON object on stderr:

```text
# not a heading
## not a section
{"exit":N}
```
EOF
)"

# The errors chapter every fixture holds, and the table the script takes from it.
errors="$(cat <<'EOF'
# Errors

| Not | This |
| --- | ---- |

## Codes

<!-- errors-table:start -->

| Code        | Status | Meaning       |
| ----------- | ------ | ------------- |
| `not_found` | 404    | No such path. |

<!-- errors-table:end -->
EOF
)"
errors_expected="$(cat <<'EOF'
| Code        | Status | Meaning       |
| ----------- | ------ | ------------- |
| `not_found` | 404    | No such path. |
EOF
)"

# The instance chapter every fixture holds, and the table the script takes from it.
instance="$(cat <<'EOF'
# The instance

| Not | This |
| --- | ---- |

## Settings

<!-- settings-table:start -->

| Setting | Default | Allowed values | What it sets |
| ------- | ------- | -------------- | ------------ |
| `PORT`  | `8600`  | Whole number   | The port.    |

<!-- settings-table:end -->
EOF
)"
instance_expected="$(cat <<'EOF'
| Setting | Default | Allowed values | What it sets |
| ------- | ------- | -------------- | ------------ |
| `PORT`  | `8600`  | Whole number   | The port.    |
EOF
)"

# The four catalogue chapters every fixture holds, and the table the script
# takes from the three it reads tables from. The types chapter only feeds the
# contract index.
catalogue_chapter() { # catalogue_chapter <marker> <header> <row>
  printf '# Chapter\n\n<!-- %s-table:start -->\n\n%s\n| --- | --- |\n%s\n\n<!-- %s-table:end -->\n' "$1" "$2" "$3" "$1"
}
catalogue_expected() { # catalogue_expected <header> <row>
  printf '%s\n| --- | --- |\n%s' "$1" "$2"
}
types_chapter="$(catalogue_chapter types '| Type | Family |' '| `core.note` | core |')"
edges_chapter="$(catalogue_chapter edge-types '| Edge type | On delete |' '| `parent-of` | cascade |')"
edges_expected="$(catalogue_expected '| Edge type | On delete |' '| `parent-of` | cascade |')"
permissions_chapter="$(catalogue_chapter permissions '| Permission | Lets |' '| `keys.mint` | Minting keys. |')"
permissions_expected="$(catalogue_expected '| Permission | Lets |' '| `keys.mint` | Minting keys. |')"
events_chapter="$(catalogue_chapter event-types '| Event | Sent to |' '| `item.created` | Streams |')"
events_expected="$(catalogue_expected '| Event | Sent to |' '| `item.created` | Streams |')"

# The contract chapters that hold rules, and the standard that only shows how a
# rule is written. The index takes a hash of each rule's sentence and reason
# from the chapters, never from the standard and never from a Tests line, and
# a heading-shaped line inside a fence is not a rule.
blobs_chapter="$(cat <<'EOF'
# Blobs

Intro that states no rule.

## Uploading

### `blobs/upload-created`

When a credential that may upload sends `POST /blobs`,
the server   MUST answer `201`.

**Reason:** the bytes are stored.

**Tests:** `correctness/blob.test.ts › one`.

### `blobs/upload-hash`

The server MUST answer the `hash`.

```text
### `blobs/not-a-rule`
```

**Tests:** waiting on #1.

## Reading

Intro to reading.

### `blobs/read-range`

The server MUST answer a range.
EOF
)"
housekeeping_chapter="$(cat <<'EOF'
# Housekeeping

### `housekeeping/run-unknown-name`

The server MUST answer `404`.

**Tests:** `compliance/housekeeping.test.ts › one`.
EOF
)"
standard="$(cat <<'EOF'
# The contract

### `housekeeping/run-unknown-name`

An example in the standard, which is not a rule.
EOF
)"
rule_hash() { printf '%s' "$1" | shasum -a 256 | cut -c1-16; }
index_expected="$(cat <<EOF
{
  "chapters": {
    "blobs": {
      "blobs/upload-created": "$(rule_hash 'When a credential that may upload sends `POST /blobs`, the server MUST answer `201`. **Reason:** the bytes are stored.')",
      "blobs/upload-hash": "$(rule_hash 'The server MUST answer the `hash`. ```text ### `blobs/not-a-rule` ```')",
      "blobs/read-range": "$(rule_hash 'The server MUST answer a range.')"
    },
    "housekeeping": {
      "housekeeping/run-unknown-name": "$(rule_hash 'The server MUST answer `404`.')"
    }
  }
}
EOF
)"

# The type catalog every fixture holds: a type with a subtype that makes a field
# required and adds others, a system type, two edge types and the name lists. The
# descriptions carry what the script must change or escape: an em dash, a pair of
# them around an aside, a pipe and a bare angle bracket.
catalog_json="$(cat <<'EOF'
{
  "types": [
    {
      "id": "core.note",
      "label": "Note",
      "description": "Text you wrote — a thought.",
      "version": 0,
      "fields": {
        "body": { "type": "string", "description": "The text <raw>", "required": true },
        "title": { "type": "string", "description": "A title | or not" },
        "language": { "type": "string", "description": "A language", "format": "bcp47" }
      },
      "display_hints": { "title_field": "title", "body_field": "body" },
      "merge_policy": { "fields": { "body": "keep_both_copies" }, "default": "last_writer_wins" }
    },
    {
      "id": "core.note.memo",
      "parent": "core.note",
      "label": "Memo",
      "description": "A memo — for a team — with a level.",
      "version": 0,
      "fields": {
        "body": { "type": "string", "description": "The memo text", "required": true },
        "title": { "type": "string", "description": "A title | or not", "required": true },
        "language": { "type": "string", "description": "A language", "format": "bcp47" },
        "level": { "type": "enum", "description": "How urgent", "enum_values": ["low", "high"] },
        "to": { "type": "array", "description": "Who it is for", "items_type": "string" }
      },
      "display_hints": { "title_field": "title", "body_field": "body" },
      "merge_policy": { "fields": { "body": "keep_both_copies" }, "default": "last_writer_wins" },
      "roles": ["container"]
    },
    {
      "id": "system.folder",
      "label": "Folder",
      "description": "A folder's settings. Active | revoked.",
      "version": 0,
      "fields": { "title": { "type": "string", "description": "The folder's name", "required": true } }
    }
  ],
  "edge_types": [
    {
      "id": "in-collection",
      "label": "In collection",
      "description": "Member of a container.",
      "cardinality": "many-to-many",
      "source_type_constraints": ["*"],
      "target_type_constraints": ["role:container"],
      "cascade_on_delete": "orphan",
      "written_at": "source",
      "property_schema": { "position": { "type": "number", "description": "Ordering." } },
      "shipped": true
    },
    {
      "id": "parent-of",
      "label": "Parent of",
      "description": "Source is the parent of the target — once.",
      "cardinality": "one-to-many",
      "source_type_constraints": ["*"],
      "target_type_constraints": ["*"],
      "cascade_on_delete": "cascade",
      "reverse_name": "child-of",
      "written_at": "target",
      "property_schema": {},
      "shipped": true
    },
    {
      "id": "in-folder",
      "label": "In folder",
      "description": "Placement of an item in a folder.",
      "cardinality": "many-to-many",
      "source_type_constraints": ["*"],
      "target_type_constraints": ["system.folder"],
      "cascade_on_delete": "orphan",
      "written_at": "none",
      "property_schema": {},
      "shipped": true
    }
  ],
  "field_types": ["string", "enum"],
  "reserved_type_roots": ["app", "core"],
  "reserved_field_names": ["id", "type"],
  "searched_field_names": ["body", "title"]
}
EOF
)"
note_expected="$(cat <<'EOF'
## Fields

| Field      | Kind               | Required | Description       |
| ---------- | ------------------ | -------- | ----------------- |
| `body`     | `string`           | Yes      | The text \<raw>   |
| `title`    | `string`           |          | A title \| or not |
| `language` | `string` (`bcp47`) |          | A language        |

## Settings

| Setting                                                | Value                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`title_field`](/catalog/your-own-types#fields)        | `title`                                                                 |
| [`body_field`](/catalog/your-own-types#fields)         | `body`                                                                  |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `body`; `last_writer_wins` for every other field |

## Subtypes

### core.note.memo [#core-note-memo]

A memo (for a team) with a level.

| Setting                                  | Value       |
| ---------------------------------------- | ----------- |
| [`roles`](/catalog/your-own-types#roles) | `container` |

| Field   | Kind                | Required | Description                        |
| ------- | ------------------- | -------- | ---------------------------------- |
| `body`  | `string`            | Yes      | The memo text                      |
| `title` | `string`            | Yes      | A title \| or not                  |
| `level` | `enum`              |          | How urgent. Values: `low`, `high`. |
| `to`    | `array` of `string` |          | Who it is for                      |
EOF
)"
folder_expected="$(cat <<'EOF'
## Fields

| Field   | Kind     | Required | Description       |
| ------- | -------- | -------- | ----------------- |
| `title` | `string` | Yes      | The folder's name |
EOF
)"
catalog_edges_expected="$(cat <<'EOF'
## in-collection

Member of a container.

| Property   | Kind     | Description |
| ---------- | -------- | ----------- |
| `position` | `number` | Ordering.   |

## parent-of

Source is the parent of the target: once.

**written_at:** `target`

## in-folder

Placement of an item in a folder.

**written_at:** `none`
EOF
)"

types_index_expected="$(cat <<'EOF'
## Core types

| Type                         | Description                | Subtypes                               |
| ---------------------------- | -------------------------- | -------------------------------------- |
| [`core.note`](/catalog/note) | Text you wrote: a thought. | [`memo`](/catalog/note#core-note-memo) |

## System types

| Type                               | Description                             |
| ---------------------------------- | --------------------------------------- |
| [`system.folder`](/catalog/folder) | A folder's settings. Active \| revoked. |
EOF
)"

item_fields_expected="$(cat <<'EOF'
### Identity

| Field | Kind     | Description    |
| ----- | -------- | -------------- |
| `id`  | `string` | The item's ID. |

### Content

| Field   | Kind     | Description       |
| ------- | -------- | ----------------- |
| `edges` | `object` | Edges \| by type. |

### State

| Field   | Kind   | Description                                     |
| ------- | ------ | ----------------------------------------------- |
| `state` | `enum` | The item's state. Values: `active`, `archived`. |
EOF
)"
edge_fields_expected="$(cat <<'EOF'
| Field     | Kind     | Description         |
| --------- | -------- | ------------------- |
| `id`      | `string` | The edge's ID.      |
| `version` | `number` | The edge's version. |
EOF
)"
event_fields_expected="$(cat <<'EOF'
## Item event fields

| Field        | Kind                                           | Description                |
| ------------ | ---------------------------------------------- | -------------------------- |
| `event_type` | `string`                                       | The event.                 |
| `item`       | [`Item`](/catalog/items#fields-every-item-has) | The item after the change. |
| `metadata`   | `object` or `null`                             | Tags and extensions.       |

## Edge event fields

| Field        | Kind                                           | Description                |
| ------------ | ---------------------------------------------- | -------------------------- |
| `event_type` | `string`                                       | The event.                 |
| `edge`       | [`Edge`](/catalog/edges#fields-every-edge-has) | The edge after the change. |

## Webhook delivery fields

| Field         | Kind     | Description        |
| ------------- | -------- | ------------------ |
| `event_id`    | `string` | The event's ID.    |
| `delivery_id` | `string` | The delivery's ID. |

## Stream frame fields

| Frame               | Field       | Kind               | Description       |
| ------------------- | ----------- | ------------------ | ----------------- |
| `stream_cursor`     | `cursor`    | `string`           | The latest event. |
| `stream_live`       | `cursor`    | `string` or `null` | Where to resume.  |
| `stream_incomplete` | `reason`    | `string`           | Why.              |
| `catchup_too_old`   | `requested` | `string`           | The ID you sent.  |
| `cursor_ahead`      | `head`      | `string`           | The latest ID.    |
| `read_view_changed` | None        |                    |                   |
EOF
)"

# The glossary every fixture holds. The script copies it and shows nothing of it
# but its banned terms, which the content lint reads.
glossary="$(cat <<'EOF'
# Glossary

Intro.

## Banned

| Word | Use instead |
| ---- | ----------- |
| record | item |
EOF
)"

# fixture <name> <spec file>
#
# Builds <name>/docs, holding the script and a stale copy of everything it
# writes, and <name>/marfa, a git checkout of a monorepo at release v1.2.3 that
# holds the spec and the command reference. The stale copies are what a refusal
# must leave as they were.
fixture() {
  local dir="${work}/$1"
  mkdir -p "${dir}/docs/scripts" "${dir}/docs/src/generated" "${dir}/marfa"
  cp "${script}" "${dir}/docs/scripts/sync-from-marfa.sh"
  printf '{"stale":"spec"}\n' > "${dir}/docs/openapi.json"
  printf 'stale glossary\n' > "${dir}/docs/src/generated/GLOSSARY.md"
  printf 'stale overview\n' > "${dir}/docs/src/generated/api-overview.md"
  mkdir -p "${dir}/docs/src/generated/cli"
  printf 'stale status\n' > "${dir}/docs/src/generated/cli/status.md"
  printf 'stale old command\n' > "${dir}/docs/src/generated/cli/old-command.md"
  printf 'stale codes\n' > "${dir}/docs/src/generated/error-codes.md"
  printf 'stale settings\n' > "${dir}/docs/src/generated/settings.md"
  printf 'stale edge types\n' > "${dir}/docs/src/generated/edge-types.md"
  printf 'stale permissions\n' > "${dir}/docs/src/generated/permissions.md"
  printf 'stale events\n' > "${dir}/docs/src/generated/event-types.md"
  printf 'stale index\n' > "${dir}/docs/src/generated/contract-index.json"
  printf '{"version":"v0.0.0"}\n' > "${dir}/docs/src/generated/marfa-release.json"
  mkdir -p "${dir}/docs/src/generated/catalog"
  printf 'stale core.note\n' > "${dir}/docs/src/generated/catalog/core.note.md"
  printf 'stale old type\n' > "${dir}/docs/src/generated/catalog/core.old.md"

  cp "$2" "${dir}/marfa/openapi.json"
  printf '%s\n' "${glossary}" > "${dir}/marfa/GLOSSARY.md"
  mkdir -p "${dir}/marfa/core/marfa-cli" "${dir}/marfa/core/marfa-core/src"
  printf '%s\n' "${catalog_json}" > "${dir}/marfa/core/marfa-core/src/builtin_catalog.json"
  printf '%s\n' "${commands}" > "${dir}/marfa/core/marfa-cli/COMMANDS.md"
  mkdir -p "${dir}/marfa/conformance/spec"
  printf '%s\n' "${errors}" > "${dir}/marfa/conformance/spec/errors.md"
  printf '%s\n' "${instance}" > "${dir}/marfa/conformance/spec/instance.md"
  printf '%s\n' "${types_chapter}" > "${dir}/marfa/conformance/spec/types.md"
  printf '%s\n' "${edges_chapter}" > "${dir}/marfa/conformance/spec/edges.md"
  printf '%s\n' "${permissions_chapter}" > "${dir}/marfa/conformance/spec/keys-and-oauth.md"
  printf '%s\n' "${events_chapter}" > "${dir}/marfa/conformance/spec/events.md"
  printf '%s\n' "${blobs_chapter}" > "${dir}/marfa/conformance/spec/blobs.md"
  printf '%s\n' "${housekeeping_chapter}" > "${dir}/marfa/conformance/spec/housekeeping.md"
  printf '%s\n' "${standard}" > "${dir}/marfa/conformance/spec/README.md"
  : > "${dir}/marfa/pnpm-workspace.yaml"
  git -C "${dir}/marfa" init -q
  git -C "${dir}/marfa" add -A
  git -C "${dir}/marfa" -c user.name=test -c user.email=test@example.com -c commit.gpgsign=false commit -q -m fixture
  git -C "${dir}/marfa" tag v1.2.3
}

# everything <name>: the docs side's files and their contents, in one string.
everything() {
  (cd "${work}/$1/docs" && find . -type f -not -path './scripts/*' | sort | while read -r file; do
    printf '== %s\n' "${file}"
    cat "${file}"
  done)
}

# sync <name>: runs the script, leaving its output in $out and its status in $status.
sync() {
  status=0
  out="$(TMPDIR="${work}/tmp" MARFA_ROOT="${work}/$1/marfa" bash "${work}/$1/docs/scripts/sync-from-marfa.sh" 2>&1)" || status=$?
}

# ------------------------------------------------------------- a good description

# Headings one to five move down a level. A sixth-level heading has nowhere to
# go and stays, as do an indented line, a `#` with no space after it, and
# everything inside a fence, whatever its marker or length. The text is trimmed
# and ends with one newline.
description="$(cat <<'EOF'

Intro paragraph.

# Top
## Second
### Third
#### Fourth
##### Fifth
###### Sixth stays
    # indented stays
   ## three spaces stays
#not a heading
```http
# in a fence
## also in a fence
```
~~~
### in a tilde fence
~~~
````md
```
# inside the long fence
```
````
## After the fences

EOF
)"
expected="$(cat <<'EOF'
Intro paragraph.

## Top
### Second
#### Third
##### Fourth
###### Fifth
###### Sixth stays
    # indented stays
   ## three spaces stays
#not a heading
```http
# in a fence
## also in a fence
```
~~~
### in a tilde fence
~~~
````md
```
# inside the long fence
```
````
### After the fences
EOF
)"

# spec_with_schemas <description>: a spec whose info.description is the argument and whose
# schemas hold what the Catalog reads: an item, an edge, the item and edge events, a
# webhook body for each, and the six frames of a stream that are not events.
spec_with_schemas() {
python3 - "$1" <<'PY'
import json, sys

ref = lambda name: {"$ref": f"#/components/schemas/{name}"}
frame = lambda name, extra: {"type": "object", "properties": {"event_type": {"type": "string", "const": name, "description": "The frame's name."}, **extra}}
delivery = {"type": "object", "properties": {"event_id": {"type": "string", "description": "The event's ID."}, "delivery_id": {"type": "string", "description": "The delivery's ID."}}}
schemas = {
    "ItemState": {"type": "string", "enum": ["active", "archived"], "description": "A state."},
    "Item": {"type": "object", "properties": {
        "id": {"type": "string", "description": "The item's ID."},
        "state": {"allOf": [ref("ItemState"), {"description": "The item's state."}]},
        "edges": {"type": "object", "additionalProperties": {}, "description": "Edges | by type."},
    }},
    "Edge": {"type": "object", "properties": {"id": {"type": "string", "description": "The edge's ID."}, "version": {"type": "number", "description": "The edge's version."}}},
    "Metadata": {"type": "object", "properties": {"tags": {"type": "array", "items": {"type": "string"}, "description": "Tags."}}},
    "ItemEventFrame": {"type": "object", "properties": {
        "event_type": {"type": "string", "enum": ["item.created"], "description": "The event."},
        "item": {"allOf": [ref("Item"), {"description": "The item after the change."}]},
        "metadata": {"oneOf": [ref("Metadata"), {"type": "null"}], "description": "Tags and extensions."},
    }},
    "EdgeEventFrame": {"type": "object", "properties": {
        "event_type": {"type": "string", "enum": ["edge.created"], "description": "The event."},
        "edge": {"allOf": [ref("Edge"), {"description": "The edge after the change."}]},
    }},
    "WebhookItemEvent": {"allOf": [ref("ItemEventFrame"), delivery]},
    "WebhookEdgeEvent": {"allOf": [ref("EdgeEventFrame"), delivery]},
    "StreamCursorFrame": frame("stream_cursor", {"cursor": {"type": "string", "description": "The latest event."}}),
    "StreamLiveFrame": frame("stream_live", {"cursor": {"type": ["string", "null"], "description": "Where to resume."}}),
    "StreamIncompleteFrame": frame("stream_incomplete", {"reason": {"type": "string", "enum": ["reader_behind"], "description": "Why."}}),
    "CatchupTooOldFrame": frame("catchup_too_old", {"requested": {"type": "string", "description": "The ID you sent."}}),
    "CursorAheadFrame": frame("cursor_ahead", {"head": {"type": "string", "description": "The latest ID."}}),
    "ReadViewChangedFrame": frame("read_view_changed", {}),
}
print(json.dumps({"openapi": "3.1.0", "info": {"title": "Marfa", "version": "0", "description": sys.argv[1]}, "paths": {}, "components": {"schemas": schemas}}))
PY
}
spec_with_schemas "${description}" > "${work}/good.json"
fixture good "${work}/good.json"
sync good
echo "a good description"
check "the script succeeds" 0 "${status}"
check "it names what it synced and the release" \
  "openapi.json, the API overview, GLOSSARY.md, the CLI's global options and exit codes in src/generated/cli, the error codes, the settings, the edge type, permission and event type catalogues, the Catalog in src/generated/catalog, the contract index, the release (v1.2.3) and its CLI download synced from ${work}/good/marfa" "${out}"
check "the overview is the description with each heading one level lower" \
  "${expected}" "$(cat "${work}/good/docs/src/generated/api-overview.md")"
check "the overview ends with one newline" "" "$(tail -c 1 "${work}/good/docs/src/generated/api-overview.md" | tr -d '\n')"
check "the spec is copied byte for byte" \
  "$(cat "${work}/good.json")" "$(cat "${work}/good/docs/openapi.json")"
check "the glossary is copied" "${glossary}" "$(cat "${work}/good/docs/src/generated/GLOSSARY.md")"
cli="${work}/good/docs/src/generated/cli"
check "the global options are their section without its heading" \
  "${cli_global_expected}" "$(cat "${cli}/global-options.md")"
check "the exit codes are their section without its heading, and a fenced line is no heading" \
  "${cli_exit_expected}" "$(cat "${cli}/exit-codes.md")"
for file in "${cli}"/*.md; do
  check "$(basename "${file}") starts with text and ends with exactly one newline" True \
    "$(python3 -c 'import sys; t = open(sys.argv[1]).read(); print(t.endswith("\n") and not t.endswith("\n\n") and not t[0].isspace())' "${file}")"
done
check "only the two sections are written, and the stale command files are gone" \
  "exit-codes.md global-options.md" "$(ls "${cli}" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"
check "the folder can be read by anyone who can read the checkout" \
  755 "$(python3 -c 'import os, sys; print(oct(os.stat(sys.argv[1]).st_mode & 0o777)[2:])' "${cli}")"
check "the error codes are the rows between the markers, and nothing else" \
  "${errors_expected}" "$(cat "${work}/good/docs/src/generated/error-codes.md")"
check "the settings are the rows between the markers, and nothing else" \
  "${instance_expected}" "$(cat "${work}/good/docs/src/generated/settings.md")"
check "the edge types are the rows between the markers, and nothing else" \
  "${edges_expected}" "$(cat "${work}/good/docs/src/generated/edge-types.md")"
check "the permissions are the rows between the markers, and nothing else" \
  "${permissions_expected}" "$(cat "${work}/good/docs/src/generated/permissions.md")"
check "the event types are the rows between the markers, and nothing else" \
  "${events_expected}" "$(cat "${work}/good/docs/src/generated/event-types.md")"
check "the contract index groups each rule's hash under its chapter, in file order" \
  "${index_expected}" "$(cat "${work}/good/docs/src/generated/contract-index.json")"
check "the release is the latest version tag" '{"version":"v1.2.3"}' "$(cat "${work}/good/docs/src/generated/marfa-release.json")"
check "the CLI download names that release and its archive" \
  'curl -fsSL https://github.com/withmarfa/marfa/releases/download/v1.2.3/marfa-1.2.3-darwin-arm64.tar.gz | tar -xz' \
  "$(sed -n 2p "${work}/good/docs/src/generated/cli-download.md")"
check "the CLI download is one bash block" '```bash|```' "$(head -1 "${work}/good/docs/src/generated/cli-download.md")|$(tail -1 "${work}/good/docs/src/generated/cli-download.md")"
check "nothing else is left in the generated folder" \
  "GLOSSARY.md api-overview.md catalog cli cli-download.md contract-index.json edge-types.md error-codes.md event-types.md marfa-release.json permissions.md settings.md" "$(ls "${work}/good/docs/src/generated" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"


# The Catalog's files: a Markdown file for each top-level type with its subtypes
# in it, the edge types, the three name lists and the fields that the spec's
# schemas give an item, an edge and an event. The directory is replaced whole.
catalog_dir="${work}/good/docs/src/generated/catalog"
check "the catalog directory holds what the script writes, and the stale files are gone" \
  "builtin-catalog.json core.note.md edge-fields.md edges.md event-fields.md item-fields.md reserved-field-names.md reserved-type-roots.md searched-field-names.md system.folder.md types.md" \
  "$(ls "${catalog_dir}" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"
check "the folder can be read by anyone who can read the checkout" \
  755 "$(python3 -c 'import os, sys; print(oct(os.stat(sys.argv[1]).st_mode & 0o777)[2:])' "${catalog_dir}")"
check "the type catalog is copied byte for byte" \
  "$(cat "${work}/good/marfa/core/marfa-core/src/builtin_catalog.json")" "$(cat "${catalog_dir}/builtin-catalog.json")"
check "a core type's file has its fields and settings, a subtype's section only what it adds or changes, an enum's values follow its description, and an em dash is a colon or a pair of parentheses" \
  "${note_expected}" "$(cat "${catalog_dir}/core.note.md")"
check "a system type's file has its fields, as a core type's does" \
  "${folder_expected}" "$(cat "${catalog_dir}/system.folder.md")"
check "each edge type is a section with its properties, and where it is written only when that is its target" \
  "${catalog_edges_expected}" "$(cat "${catalog_dir}/edges.md")"
check "the index lists each family's top-level types, linked to their pages, with a subtype linked to its section and a pipe escaped" \
  "${types_index_expected}" "$(cat "${catalog_dir}/types.md")"
check "the reserved roots are one paragraph" '`app`, `core`' "$(cat "${catalog_dir}/reserved-type-roots.md")"
check "the reserved field names are one paragraph" '`id`, `type`' "$(cat "${catalog_dir}/reserved-field-names.md")"
check "the searched field names are one paragraph" '`body`, `title`' "$(cat "${catalog_dir}/searched-field-names.md")"
check "the item's fields come from its schema in their groups, with a state's values after its description and a pipe escaped" \
  "${item_fields_expected}" "$(cat "${catalog_dir}/item-fields.md")"
check "the edge's fields come from its schema" \
  "${edge_fields_expected}" "$(cat "${catalog_dir}/edge-fields.md")"
check "the event fields are one table for each shape, the webhook fields once, and a frame with no field a row of None" \
  "${event_fields_expected}" "$(cat "${catalog_dir}/event-fields.md")"
for file in "${catalog_dir}"/*.md; do
  check "$(basename "${file}") ends with exactly one newline and starts with text" True \
    "$(python3 -c 'import sys; t = open(sys.argv[1]).read(); print(t.endswith("\n") and not t.endswith("\n\n") and not t[0].isspace())' "${file}")"
done

# The split must not depend on the folder being there already, or on how the
# reference's lines end.
echo "a command reference in other conditions"
fixture first "${work}/good.json"
rm -r "${work}/first/docs/src/generated/cli"
sync first
check "no cli folder yet: the script succeeds" 0 "${status}"
check "no cli folder yet: the folder is written" \
  "exit-codes.md global-options.md" "$(ls "${work}/first/docs/src/generated/cli" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"

fixture crlf "${work}/good.json"
awk '{ printf "%s\r\n", $0 }' "${work}/crlf/marfa/core/marfa-cli/COMMANDS.md" > "${work}/crlf.md"
cp "${work}/crlf.md" "${work}/crlf/marfa/core/marfa-cli/COMMANDS.md"
sync crlf
check "Windows line endings: the script succeeds" 0 "${status}"
check "Windows line endings: the files are the same" \
  "$(cat "${cli}/global-options.md" "${cli}/exit-codes.md")" \
  "$(cat "${work}/crlf/docs/src/generated/cli/global-options.md" "${work}/crlf/docs/src/generated/cli/exit-codes.md")"

# ----------------------------------------------------------------- every refusal

# refuse <label> <expected message> <spec text>
#
# The script exits 1 with the one line, shows no traceback, and leaves every
# file it writes as it found it. In the message, @marfa@ and @docs@ stand for
# the fixture's two checkouts.
n=0
refuse() {
  n=$((n+1))
  local name="refusal-${n}"
  printf '%s\n' "$3" > "${work}/${name}.json"
  fixture "${name}" "${work}/${name}.json"
  local before; before="$(everything "${name}")"
  sync "${name}"
  check "${1}: exits 1" 1 "${status}"
  local message="${2//@marfa@/${work}/${name}/marfa}"
  message="${message//@docs@/${work}/${name}/docs}"
  check "${1}: says so in one line" "${message}" "${out}"
  check "${1}: shows no traceback" 0 "$(printf '%s' "${out}" | grep -c 'Traceback\|File "' || true)"
  check "${1}: changes nothing" "${before}" "$(everything "${name}")"
}

echo "a spec the script refuses"
nodesc="@marfa@/openapi.json has no info.description. Nothing has changed."
refuse "no description" "${nodesc}" '{"info": {"title": "Marfa", "version": "0"}}'
refuse "an empty description" "${nodesc}" '{"info": {"description": ""}}'
refuse "a blank description" "${nodesc}" '{"info": {"description": "  \n\t "}}'
refuse "a null description" "${nodesc}" '{"info": {"description": null}}'
refuse "a number for a description" "${nodesc}" '{"info": {"description": 12}}'
refuse "a list for a description" "${nodesc}" '{"info": {"description": ["Intro."]}}'
refuse "an object for a description" "${nodesc}" '{"info": {"description": {"text": "Intro."}}}'
refuse "no info" "${nodesc}" '{"openapi": "3.1.0", "paths": {}}'
refuse "a string for info" "${nodesc}" '{"info": "Marfa"}'
refuse "a list for info" "${nodesc}" '{"info": [{"description": "Intro."}]}'
refuse "a null for info" "${nodesc}" '{"info": null}'
refuse "a list at the top" "${nodesc}" '[{"info": {"description": "Intro."}}]'
refuse "a string at the top" "${nodesc}" '"Intro."'
refuse "null at the top" "${nodesc}" 'null'
refuse "invalid JSON" "@marfa@/openapi.json is not valid JSON. @docs@/openapi.json is unchanged." '{"info": {"description": "Intro."'

echo "a checkout the script refuses"
# No release tag: the spec is good, and still nothing is written.
spec_with_schemas "Intro." > "${work}/untagged.json"
fixture untagged "${work}/untagged.json"
git -C "${work}/untagged/marfa" tag -d v1.2.3 > /dev/null
before="$(everything untagged)"
sync untagged
check "no release tag: exits 1" 1 "${status}"
check "no release tag: says so" \
  "No release tag found in ${work}/untagged/marfa (run 'git fetch --tags' there). Nothing has changed." "${out}"
check "no release tag: changes nothing" "${before}" "$(everything untagged)"

# refuse_commands <label> <expected message> <command reference text, or
# "absent" for no file>: the spec and the tag are good, and still nothing is
# written. The message's @marfa@ is the fixture's monorepo.
m=0
refuse_commands() {
  m=$((m+1))
  local name="commands-${m}"
  fixture "${name}" "${work}/untagged.json"
  local file="${work}/${name}/marfa/core/marfa-cli/COMMANDS.md"
  if [ "$3" = absent ]; then rm "${file}"; else printf '%b' "$3" > "${file}"; fi
  local before; before="$(everything "${name}")"
  sync "${name}"
  check "${1}: exits 1" 1 "${status}"
  check "${1}: says so in one line" "${2//@marfa@/${work}/${name}/marfa}" "${out}"
  check "${1}: shows no traceback" 0 "$(printf '%s' "${out}" | grep -c 'Traceback\|File "' || true)"
  check "${1}: changes nothing" "${before}" "$(everything "${name}")"
}
# The parts a reference is made of, to build one that lacks or breaks one.
cli_head='<!-- Generated. -->\n\n# Command reference\n\nIntro.\n\n'
cli_global='## Global options\n\nEvery command accepts these.\n\n'
cli_exit='## Exit codes\n\n| Code | Meaning |\n| --- | --- |\n| 0 | Done. |\n\n'
cli_status='## status\n\nAbout.\n\n### marfa status\n\n```text\nmarfa status\n```\n\n'
cli_file="@marfa@/core/marfa-cli/COMMANDS.md"
refuse_commands "no command reference" "No core/marfa-cli/COMMANDS.md in @marfa@. Nothing has changed." absent
refuse_commands "an empty command reference" "No core/marfa-cli/COMMANDS.md in @marfa@. Nothing has changed." ''
refuse_commands "a command reference with only its comment and title" \
  "${cli_file} has no '## Global options' section. Nothing has changed." '<!-- Generated. -->\n\n# Command reference\n\n'
refuse_commands "a comment that never closes" \
  "${cli_file} opens a comment that never closes. Nothing has changed." "<!-- Generated.\n# Command reference\n${cli_global}${cli_exit}${cli_status}"
refuse_commands "a command reference that is not UTF-8" \
  "${cli_file} is not UTF-8. Nothing has changed." "${cli_head}${cli_global}${cli_exit}${cli_status}\xff\xfe\n"
refuse_commands "no global options" \
  "${cli_file} has no '## Global options' section. Nothing has changed." "${cli_head}${cli_exit}${cli_status}"
refuse_commands "global options only inside a fence" \
  "${cli_file} has no '## Global options' section. Nothing has changed." "${cli_head}"'```text\n## Global options\n```\n\n'"${cli_exit}${cli_status}"
refuse_commands "global options of another level" \
  "${cli_file} has no '## Global options' section. Nothing has changed." "${cli_head}### Global options\n\nEvery command accepts these.\n\n${cli_exit}${cli_status}"
refuse_commands "no exit codes" \
  "${cli_file} has no '## Exit codes' section. Nothing has changed." "${cli_head}${cli_global}${cli_status}"
refuse_commands "exit codes only inside a fence" \
  "${cli_file} has no '## Exit codes' section. Nothing has changed." "${cli_head}${cli_global}"'```text\n## Exit codes\n```\n\n'"${cli_status}"
refuse_commands "global options that repeat" \
  "${cli_file} repeats the section '## Global options'. Nothing has changed." "${cli_head}${cli_global}${cli_exit}${cli_global}${cli_status}"
refuse_commands "exit codes that repeat" \
  "${cli_file} repeats the section '## Exit codes'. Nothing has changed." "${cli_head}${cli_global}${cli_exit}${cli_status}${cli_exit}"
refuse_commands "global options with nothing under them" \
  "${cli_file} has nothing under '## Global options'. Nothing has changed." "${cli_head}## Global options\n\n${cli_exit}${cli_status}"
refuse_commands "exit codes with only blank lines under them" \
  "${cli_file} has nothing under '## Exit codes'. Nothing has changed." "${cli_head}${cli_global}## Exit codes\n\n\n\n${cli_status}"

# What is not the two sections is not read: a command section can be called
# anything, repeat, hold nothing or be absent, and the script still writes the
# two files and nothing else.
echo "a command reference with odd or no command sections"
fixture odd "${work}/untagged.json"
printf '%b' "${cli_head}${cli_global}${cli_exit}## Status\n\n## sign_ins\n\nAbout.\n\n## 2fa\n\n## sign ins\n\n## exit-codes\n\nAbout.\n\n${cli_status}${cli_status}" \
  > "${work}/odd/marfa/core/marfa-cli/COMMANDS.md"
fixture bare "${work}/untagged.json"
printf '%b' "${cli_head}${cli_global}${cli_exit}" > "${work}/bare/marfa/core/marfa-cli/COMMANDS.md"
for name in odd bare; do
  sync "${name}"
  check "${name} command sections: the script succeeds" 0 "${status}"
  check "${name} command sections: the global options are written" \
    "Every command accepts these." "$(cat "${work}/${name}/docs/src/generated/cli/global-options.md")"
  check "${name} command sections: the exit codes are written" \
    "$(printf '%b' '| Code | Meaning |\n| --- | --- |\n| 0 | Done. |')" "$(cat "${work}/${name}/docs/src/generated/cli/exit-codes.md")"
  check "${name} command sections: no other file is written" \
    "exit-codes.md global-options.md" "$(ls "${work}/${name}/docs/src/generated/cli" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"
done

# refuse_table <heading> <chapter file> <marker> <noun> <label> <chapter text, or
# "absent" for no file>: the spec, the tag, the command reference and every
# other chapter are good, and still nothing is written.
t=0
refuse_table() {
  t=$((t+1))
  local name="table-${t}"
  fixture "${name}" "${work}/untagged.json"
  local file="${work}/${name}/marfa/conformance/spec/$2"
  if [ "$6" = absent ]; then rm "${file}"; else printf '%b' "$6" > "${file}"; fi
  local before; before="$(everything "${name}")"
  sync "${name}"
  local message
  if [ "$6" = absent ] || [ -z "$6" ]; then
    message="No conformance/spec/$2 in ${work}/${name}/marfa. Nothing has changed."
  else
    message="${file} is not UTF-8 or has no $4 table between its $3-table markers. Nothing has changed."
  fi
  check "$2, ${5}: exits 1" 1 "${status}"
  check "$2, ${5}: says so in one line" "${message}" "${out}"
  check "$2, ${5}: shows no traceback" 0 "$(printf '%s' "${out}" | grep -c 'Traceback\|File "' || true)"
  check "$2, ${5}: changes nothing" "${before}" "$(everything "${name}")"
}

# refuse_table_cases <chapter file> <marker> <noun> <header cell>: the same nine
# chapters for every table.
refuse_table_cases() {
  local f="$1" m="$2" n="$3" h="$4"
  local start="<!-- ${m}-table:start -->" end="<!-- ${m}-table:end -->"
  local head="| ${h} | Other |\\n| --- | --- |"
  echo "$f, a chapter the script refuses"
  refuse_table "$f" "$f" "$m" "$n" "no chapter" absent
  refuse_table "$f" "$f" "$m" "$n" "an empty chapter" ''
  refuse_table "$f" "$f" "$m" "$n" "no markers" "# Chapter\\n\\n${head}\\n| \`x\` | y |\\n"
  refuse_table "$f" "$f" "$m" "$n" "no end marker" "${start}\\n${head}\\n| \`x\` | y |\\n"
  refuse_table "$f" "$f" "$m" "$n" "the markers in the wrong order" "${end}\\n${head}\\n| \`x\` | y |\\n${start}\\n"
  refuse_table "$f" "$f" "$m" "$n" "nothing between the markers" "${start}\\n\\n${end}\\n"
  refuse_table "$f" "$f" "$m" "$n" "a header with no rows" "${start}\\n${head}\\n${end}\\n"
  refuse_table "$f" "$f" "$m" "$n" "prose between the markers" "${start}\\nNot a table.\\n${head}\\n| \`x\` | y |\\n${end}\\n"
  refuse_table "$f" "$f" "$m" "$n" "a chapter that is not UTF-8" "${start}\\n| \\xff | y |\\n| --- | --- |\\n| \`x\` | y |\\n${end}\\n"
}
refuse_table_cases errors.md errors code Code
refuse_table_cases instance.md settings settings Setting
refuse_table_cases edges.md edge-types "edge types" "Edge type"
refuse_table_cases keys-and-oauth.md permissions permissions Permission
refuse_table_cases events.md event-types "event types" Event

# The hash covers the rule and its reason and nothing else: a new Tests line, a
# reflowed paragraph and an edited intro leave every hash alone, and an edited
# rule changes only its own.
echo "what the contract index hashes"
fixture hashed "${work}/untagged.json"
spec_dir="${work}/hashed/marfa/conformance/spec"
python3 - "${spec_dir}/blobs.md" <<'PY'
import sys
p = sys.argv[1]
t = open(p).read()
t = t.replace("**Tests:** waiting on #1.", "**Tests:** `correctness/renamed.test.ts › renamed`,\n`› and another`.")
t = t.replace("Intro to reading.", "A different intro to reading.")
t = t.replace("When a credential that may upload sends `POST /blobs`,\nthe server   MUST", "When a credential that may upload\nsends `POST /blobs`, the server MUST")
t = t.replace("The server MUST answer a range.", "The server MUST answer a byte range.")
open(p, "w").write(t)
PY
git -C "${work}/hashed/marfa" -c user.name=test -c user.email=test@example.com -c commit.gpgsign=false commit -q -am edit
sync hashed
check "an edit to a Tests line, an intro or the wrapping: the script succeeds" 0 "${status}"
check "an edit to a rule changes its hash only" \
  "$(printf '%s\n' "${index_expected}" | sed "s/$(rule_hash 'The server MUST answer a range.')/$(rule_hash 'The server MUST answer a byte range.')/")" \
  "$(cat "${work}/hashed/docs/src/generated/contract-index.json")"

# refuse_contract <label> <text for the blobs chapter> [alone: no other chapter]
c=0
refuse_contract() {
  c=$((c+1))
  local name="contract-${c}"
  fixture "${name}" "${work}/untagged.json"
  local dir="${work}/${name}/marfa/conformance/spec"
  printf '%b' "$2" > "${dir}/blobs.md"
  if [ "${3:-}" = alone ]; then rm "${dir}/housekeeping.md"; fi
  local before; before="$(everything "${name}")"
  sync "${name}"
  check "${1}: exits 1" 1 "${status}"
  check "${1}: says so in one line" \
    "The contract in ${work}/${name}/marfa/conformance/spec has no rules, a rule ID that repeats or names another chapter, or a chapter that is not UTF-8. Nothing has changed." "${out}"
  check "${1}: shows no traceback" 0 "$(printf '%s' "${out}" | grep -c 'Traceback\|File "' || true)"
  check "${1}: changes nothing" "${before}" "$(everything "${name}")"
}
echo "a contract the script refuses"
refuse_contract "no rules in any chapter" '# Blobs\n\nNo rules here.\n' alone
refuse_contract "a rule ID that repeats" '### `blobs/a`\n\nThe server MUST.\n\n### `blobs/a`\n\nThe server MUST again.\n'
refuse_contract "a rule ID that names another chapter" '### `items/a`\n\nThe server MUST.\n'
refuse_contract "a chapter that is not UTF-8" '### `blobs/a`\n\nThe server MUST \xff.\n'


# refuse_catalog <label> <message after the path> <catalog text, "absent" for no file>:
# everything else is good, and still nothing is written. @marfa@ is the fixture's monorepo.
k=0
refuse_catalog() {
  k=$((k+1))
  local name="catalog-${k}"
  fixture "${name}" "${work}/untagged.json"
  local file="${work}/${name}/marfa/core/marfa-core/src/builtin_catalog.json"
  if [ "$3" = absent ]; then rm "${file}"; else printf '%b' "$3" > "${file}"; fi
  local before; before="$(everything "${name}")"
  sync "${name}"
  local message="${2//@marfa@/${work}/${name}/marfa}"
  check "${1}: exits 1" 1 "${status}"
  check "${1}: says so in one line" "${message}" "${out}"
  check "${1}: shows no traceback" 0 "$(printf '%s' "${out}" | grep -c 'Traceback\|File "' || true)"
  check "${1}: changes nothing" "${before}" "$(everything "${name}")"
}
# catalog_with <python statements on the catalog c>: the fixture's catalog, changed.
catalog_with() {
  printf '%s' "${catalog_json}" | python3 -c 'import json, sys; c = json.load(sys.stdin); exec(sys.argv[1]); print(json.dumps(c))' "$1"
}
cat_file="@marfa@/core/marfa-core/src/builtin_catalog.json"
echo "a type catalog the script refuses"
refuse_catalog "no type catalog" "No core/marfa-core/src/builtin_catalog.json in @marfa@. Nothing has changed." absent
refuse_catalog "an empty type catalog" "No core/marfa-core/src/builtin_catalog.json in @marfa@. Nothing has changed." ''
refuse_catalog "a type catalog that is not JSON" "${cat_file} is not valid JSON. Nothing has changed." '{"types": ['
refuse_catalog "a type catalog that is not UTF-8" "${cat_file} is not UTF-8. Nothing has changed." '{"types": "\xff\xfe"}'
refuse_catalog "a list at the top" "${cat_file} is not an object. Nothing has changed." '[]'
refuse_catalog "no types" "${cat_file} has no types or no edge_types. Nothing has changed." "$(catalog_with 'c["types"] = []')"
refuse_catalog "no edge types" "${cat_file} has no types or no edge_types. Nothing has changed." "$(catalog_with 'del c["edge_types"]')"
refuse_catalog "no searched field names" "${cat_file} has no searched_field_names list. Nothing has changed." "$(catalog_with 'del c["searched_field_names"]')"
refuse_catalog "a name list of numbers" "${cat_file} has no reserved_field_names list. Nothing has changed." "$(catalog_with 'c["reserved_field_names"] = [1]')"
refuse_catalog "a type that is not an object" "${cat_file} has a type with no id, or one that repeats. Nothing has changed." "$(catalog_with 'c["types"].append("core.x")')"
refuse_catalog "a type that repeats" "${cat_file} has a type with no id, or one that repeats. Nothing has changed." "$(catalog_with 'c["types"].append(c["types"][0])')"
refuse_catalog "a type with a key the sync does not write" "${cat_file} has a key 'link_field' on core.note that the sync does not write. Nothing has changed." "$(catalog_with 'c["types"][0]["link_field"] = "title"')"
refuse_catalog "a type with no description" "${cat_file} has no description for core.note. Nothing has changed." "$(catalog_with 'del c["types"][0]["description"]')"
refuse_catalog "a type with no fields" "${cat_file} has no fields for core.note. Nothing has changed." "$(catalog_with 'c["types"][0]["fields"] = []')"
refuse_catalog "a field with a key the sync does not write" "${cat_file} has a key 'maxLength' on core.note.body that the sync does not write. Nothing has changed." "$(catalog_with 'c["types"][0]["fields"]["body"]["maxLength"] = 9')"
refuse_catalog "a field with no description" "${cat_file} has a field core.note.body without a type and a description. Nothing has changed." "$(catalog_with 'del c["types"][0]["fields"]["body"]["description"]')"
refuse_catalog "an enum with no values" "${cat_file} has an enum core.note.memo.level without values. Nothing has changed." "$(catalog_with 'del c["types"][1]["fields"]["level"]["enum_values"]')"
refuse_catalog "an array with no items_type" "${cat_file} has an array core.note.memo.to without an items_type. Nothing has changed." "$(catalog_with 'del c["types"][1]["fields"]["to"]["items_type"]')"
refuse_catalog "a parent that is not a type" "${cat_file} names the parent core.thing of core.note.memo, which is not a type in it. Nothing has changed." "$(catalog_with 'c["types"][1]["parent"] = "core.thing"')"
refuse_catalog "a parent in another family" "${cat_file} has core.note.memo under a parent in another family. Nothing has changed." "$(catalog_with 'c["types"][1]["parent"] = "system.folder"')"
refuse_catalog "a role other than container" "${cat_file} has a role on core.note.memo other than container. Nothing has changed." "$(catalog_with 'c["types"][1]["roles"] = ["archive"]')"
refuse_catalog "a top-level type outside the core and system families" "${cat_file} has a top-level type outside the core and system families. Nothing has changed." "$(catalog_with 'c["types"].append({"id": "user.recipe", "label": "Recipe", "description": "A recipe.", "fields": {"title": {"type": "string", "description": "A title"}}})')"
refuse_catalog "no top-level system type" "${cat_file} has no top-level system type. Nothing has changed." "$(catalog_with 'c["types"] = [t for t in c["types"] if not t["id"].startswith("system.")]')"
refuse_catalog "a top-level type with more than a family and a name" "${cat_file} has the top-level type core.note.memo, whose identifier is not a family and a name. Nothing has changed." "$(catalog_with 'del c["types"][1]["parent"]')"
refuse_catalog "types that are each other's parent" "${cat_file} has core.note under a chain of parents that never reaches a top-level type. Nothing has changed." "$(catalog_with 'c["types"][0]["parent"] = "core.note.memo"')"
refuse_catalog "a merge strategy the sync does not know" "${cat_file} has a merge policy for core.note with a strategy the sync does not know. Nothing has changed." "$(catalog_with 'c["types"][0]["merge_policy"]["default"] = "newest"')"
refuse_catalog "display hints the sync does not write" "${cat_file} has display hints for core.note that the sync does not write. Nothing has changed." "$(catalog_with 'c["types"][0]["display_hints"]["icon_field"] = "title"')"
refuse_catalog "an edge type with no description" "${cat_file} has an edge type with no id or description. Nothing has changed." "$(catalog_with 'del c["edge_types"][0]["description"]')"
refuse_catalog "an edge type with a key the sync does not write" "${cat_file} has a key 'weight' on the edge type in-collection that the sync does not write. Nothing has changed." "$(catalog_with 'c["edge_types"][0]["weight"] = 1')"
refuse_catalog "an edge type written nowhere the sync knows" "${cat_file} has the edge type in-collection with a written_at the sync does not know. Nothing has changed." "$(catalog_with 'c["edge_types"][0]["written_at"] = "both"')"
refuse_catalog "an edge type written at its target with no reverse name" "${cat_file} has the edge type parent-of written at its target with no reverse_name. Nothing has changed." "$(catalog_with 'del c["edge_types"][1]["reverse_name"]')"

# Shapes the sync writes without a rule of its own: a default of both copies says which fields do not
# keep them, and a type with nothing to add has no table.
echo "a type catalog in other shapes"
fixture shapes "${work}/untagged.json"
catalog_with 'c["types"][0]["merge_policy"] = {"default": "keep_both_copies", "fields": {"title": "last_writer_wins", "language": "last_writer_wins"}}; c["types"].append({"id": "core.note.bare", "parent": "core.note", "label": "Bare", "description": "A note.", "version": 0, "fields": c["types"][0]["fields"]})' \
  > "${work}/shapes/marfa/core/marfa-core/src/builtin_catalog.json"
sync shapes
check "a default of both copies and a subtype with no field to add: the script succeeds" 0 "${status}"
check "a default of both copies names the fields that do not keep both, as values" 1 \
  "$(grep -cF '| [`merge_policy`](/catalog/your-own-types#merge-policy) | `last_writer_wins` for `title` and `language`; `keep_both_copies` for every other field |' "${work}/shapes/docs/src/generated/catalog/core.note.md")"
check "a subtype with nothing to add is a heading and its description" \
  "$(printf '### core.note.bare [#core-note-bare]\n\nA note.')" "$(sed -n '/^### core.note.bare \[#core-note-bare\]$/,$p' "${work}/shapes/docs/src/generated/catalog/core.note.md")"

# A subtype says what its parent does not already say: display hints and a merge policy only where
# they differ from the parent's, and nothing where they are equal.
echo "a subtype that repeats or changes what its parent says"
fixture drift "${work}/untagged.json"
catalog_with 'base = c["types"][0]; c["types"].append({"id": "core.note.same", "parent": "core.note", "label": "Same", "description": "Says what the parent says.", "version": 0, "fields": base["fields"], "display_hints": dict(base["display_hints"]), "merge_policy": json.loads(json.dumps(base["merge_policy"]))}); c["types"].append({"id": "core.note.drift", "parent": "core.note", "label": "Drift", "description": "Says something else.", "version": 0, "fields": base["fields"], "display_hints": {"title_field": "language", "body_field": "body"}, "merge_policy": {"default": "keep_both_copies"}})' \
  > "${work}/drift/marfa/core/marfa-core/src/builtin_catalog.json"
sync drift
drift_file="${work}/drift/docs/src/generated/catalog/core.note.md"
check "a subtype that differs from its parent: the script succeeds" 0 "${status}"
check "a subtype equal to its parent says nothing of hints or merge policy" \
  "$(printf '### core.note.same [#core-note-same]\n\nSays what the parent says.')" \
  "$(sed -n '/^### core.note.same/,/^### core.note.drift/p' "${drift_file}" | sed '$d')"
check "a subtype that differs says its hints and merge policy as values" \
  "$(printf '%s\n%s\n%s' '| [`title_field`](/catalog/your-own-types#fields)        | `language`                         |' '| [`body_field`](/catalog/your-own-types#fields)         | `body`                             |' '| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for every field |')" \
  "$(sed -n '/^### core.note.drift/,$p' "${drift_file}" | grep '^| \[`')"
check "the parent says its own hints once, and a subtype equal to it adds none" 1 \
  "$(grep -cE '^\| \[`title_field`\].*\| `title` +\|$' "${drift_file}")"

# spec_with <python statements on the spec s>: the fixture's spec, changed.
spec_with() {
  python3 -c 'import json, sys; s = json.load(open(sys.argv[1])); exec(sys.argv[2]); print(json.dumps(s))' "${work}/untagged.json" "$1"
}
sch_file="@marfa@/openapi.json"
echo "a spec without the schemas the Catalog reads"
refuse "no components" "${sch_file} does not describe the item, edge and event schemas the sync reads (KeyError: 'components'). Nothing has changed." "$(spec_with 'del s["components"]')"
refuse "no item schema" "${sch_file} has no schema Item. Nothing has changed." "$(spec_with 'del s["components"]["schemas"]["Item"]')"
refuse "no stream frame schema" "${sch_file} has no schema StreamLiveFrame. Nothing has changed." "$(spec_with 'del s["components"]["schemas"]["StreamLiveFrame"]')"
refuse "an edge schema with no properties" "${sch_file} has no properties on the schema Edge. Nothing has changed." "$(spec_with 's["components"]["schemas"]["Edge"]["properties"] = {}')"
refuse "a frame with no name constant" "${sch_file} has no event_type constant on the schema CursorAheadFrame. Nothing has changed." "$(spec_with 'del s["components"]["schemas"]["CursorAheadFrame"]["properties"]["event_type"]["const"]')"
refuse "a webhook body that is not a frame plus its fields" "${sch_file} has a webhook schema WebhookItemEvent that is not a frame plus its delivery fields. Nothing has changed." "$(spec_with 's["components"]["schemas"]["WebhookItemEvent"] = {"type": "object"}')"
refuse "an array property with no items" "${sch_file} has an array property with no items. Nothing has changed." "$(spec_with 's["components"]["schemas"]["Edge"]["properties"]["tags"] = {"type": "array", "description": "Tags."}')"
refuse "an item enum the sync cannot reach the values of" "${sch_file} has the property state, an enum whose values the sync cannot reach. Nothing has changed." "$(spec_with 's["components"]["schemas"]["Item"]["properties"]["state"] = {"type": "array", "items": {"type": "string", "enum": ["a", "b"]}, "description": "States."}')"
refuse "an item field in no group" "${sch_file} has the item field colour, which the sync puts in no group. Nothing has changed." "$(spec_with 's["components"]["schemas"]["Item"]["properties"]["colour"] = {"type": "string", "description": "A colour."}')"
refuse "a property with no type" "${sch_file} has a property with no type. Nothing has changed." "$(spec_with 'del s["components"]["schemas"]["Edge"]["properties"]["id"]["type"]')"

echo "a spec whose webhook bodies add different fields"
spec_with 's["components"]["schemas"]["WebhookEdgeEvent"]["allOf"][1]["properties"]["attempt"] = {"type": "integer", "description": "Which attempt."}' > "${work}/two-deliveries.json"
fixture two-deliveries "${work}/two-deliveries.json"
sync two-deliveries
check "two shapes of webhook body: the script succeeds" 0 "${status}"
check "each shape of webhook body gets its own table" \
  "## Item webhook delivery fields|## Edge webhook delivery fields|2" \
  "$(grep '^## .*webhook delivery fields$' "${work}/two-deliveries/docs/src/generated/catalog/event-fields.md" | paste -sd'|' -)|$(grep -c '^## .*webhook delivery fields$' "${work}/two-deliveries/docs/src/generated/catalog/event-fields.md")"
check "the field only one shape adds is in the edge table" 1 \
  "$(sed -n '/^## Edge webhook delivery fields$/,/^## Stream/p' "${work}/two-deliveries/docs/src/generated/catalog/event-fields.md" | grep -c '`attempt`')"

echo "temporary files"
check "no temporary file or folder is left behind, by a success or a refusal" "" "$(ls -A "${work}/tmp")"

echo "the workflow"
check "CI runs this test" 1 "$(grep -cF 'run: bash .github/scripts/sync-from-marfa.test.sh' "${here}/../workflows/ci.yml")"

printf '\nsync-from-marfa: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
