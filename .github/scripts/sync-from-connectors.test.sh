#!/usr/bin/env bash
# Runs scripts/sync-from-connectors.sh against throwaway checkouts of the docs and
# of marfa-connectors, and pins what it writes and when it refuses.
#
# It copies marfa-connectors' committed connectors.json into src/generated/connectors,
# writes the connector index (a table of mark, name and what each brings in, ordered
# by name) and a header for each connector (its source, its types, and whether it
# carries changes back and can be turned off), and a page for each connector that has
# none. A page that exists is never touched. A list that is missing, not committed,
# not JSON, not schema 1, empty, with a connector that lacks a field, repeats a name
# or has a mark that is not a Simple Icons ID, and a docs checkout with no type
# catalog, must stop the script before it changes anything, with one line saying so.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="${here}/../../scripts/sync-from-connectors.sh"

pass=0; fail=0
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then pass=$((pass+1)); printf '  ok    %s\n' "$1"
  else fail=$((fail+1)); printf '  FAIL  %s: expected %s, got %s\n' "$1" "$2" "$(printf '%s' "$3" | head -c 300)"; fi
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir "${work}/tmp"

# Three connectors, two of which share a source and one of which has no mark.
good_list='{"schema":1,"about":"x","connectors":[
{"directory":"connectors/todoist","name":"todoist","description":"Tasks | and more.","source":"todoist","sourceName":"Todoist","sourceMark":"simple-icons:todoist","types":["todoist.task"],"carriesBack":true,"carriesBackCanBeTurnedOff":true,"carriedTypes":["todoist.task"]},
{"directory":"connectors/readwise-reader","name":"readwise-reader","description":"Reader documents.","source":"readwise","sourceName":"Readwise","types":["readwise.source","core.note"],"carriesBack":true,"carriesBackCanBeTurnedOff":false,"carriedTypes":["core.note"]},
{"directory":"connectors/readwise","name":"readwise","description":"Sources.","source":"readwise","sourceName":"Readwise","types":["readwise.source"],"carriesBack":false,"carriesBackCanBeTurnedOff":false,"carriedTypes":[]}
]}'

catalog='{"types":[{"id":"core.note"},{"id":"core.media"},{"id":"core.media.film"},{"id":"system.view"}]}'

# fixture <name> <list>: <name>/docs holds the script, a stale copy of what it
# writes and a page for readwise; <name>/connectors is a git checkout holding the list.
fixture() {
  local dir="${work}/$1"
  mkdir -p "${dir}/docs/scripts" "${dir}/docs/src/generated/catalog" "${dir}/docs/src/generated/connectors" "${dir}/docs/content/docs/catalog/connectors" "${dir}/connectors"
  cp "${script}" "${dir}/docs/scripts/sync-from-connectors.sh"
  printf '%s\n' "${catalog}" > "${dir}/docs/src/generated/catalog/builtin-catalog.json"
  printf 'stale list\n' > "${dir}/docs/src/generated/connectors/connectors.json"
  printf 'stale old connector\n' > "${dir}/docs/src/generated/connectors/old.md"
  printf 'hand-written readwise\n' > "${dir}/docs/content/docs/catalog/connectors/readwise.mdx"
  printf '%s\n' "$2" > "${dir}/connectors/connectors.json"
  git -C "${dir}/connectors" init -q
  git -C "${dir}/connectors" add -A
  git -C "${dir}/connectors" -c user.name=test -c user.email=test@example.com -c commit.gpgsign=false commit -q -m fixture
}

everything() {
  (cd "${work}/$1/docs" && find . -type f -not -path './scripts/*' | sort | while read -r file; do
    printf '== %s\n' "${file}"
    cat "${file}"
  done)
}

sync() { # sync <name> [connectors root]
  status=0
  out="$(TMPDIR="${work}/tmp" MARFA_CONNECTORS_ROOT="${2:-${work}/$1/connectors}" bash "${work}/$1/docs/scripts/sync-from-connectors.sh" 2>&1)" || status=$?
}

# ------------------------------------------------------------------ a good list

fixture good "${good_list}"
sync good
check "a good list syncs" 0 "${status}"
docs="${work}/good/docs/src/generated/connectors"
check "the list is copied whole" "$(printf '%s\n' "${good_list}")" "$(cat "${docs}/connectors.json")"
check "the stale file is gone" "no" "$([ -e "${docs}/old.md" ] && echo yes || echo no)"
check "the index is ordered by name, with the mark as code, aligned, a pipe escaped" \
'| Mark                   | Connector                                              | Brings in          |
| ---------------------- | ------------------------------------------------------ | ------------------ |
|                        | [Readwise](/catalog/connectors/readwise)               | Sources.           |
|                        | [Readwise Reader](/catalog/connectors/readwise-reader) | Reader documents.  |
| `simple-icons:todoist` | [Todoist](/catalog/connectors/todoist)                 | Tasks \| and more. |' \
"$(cat "${docs}/index.md")"
check "a header names source, types, what is carried back and whether it can be turned off, and links a type with a Catalog page" \
'- **Source:** `readwise`, shown as Readwise
- **Types:** `readwise.source`, [`core.note`](/catalog/note)
- **Carries changes back:** Yes, for [`core.note`](/catalog/note)
- **Can be turned off:** No' \
"$(cat "${docs}/readwise-reader.md")"
check "a connector that carries nothing back says no and omits the turn-off line" \
'- **Source:** `readwise`, shown as Readwise
- **Types:** `readwise.source`
- **Carries changes back:** No' \
"$(cat "${docs}/readwise.md")"
pages="${work}/good/docs/content/docs/catalog/connectors"
check "a page that exists is left as it was" "hand-written readwise" "$(cat "${pages}/readwise.mdx")"
check "a connector with no page gets one, keyed by its name, holding its header" \
'---
title: "Readwise Reader"
description: "Reader documents."
---

<include cwd>src/generated/connectors/readwise-reader.md</include>' \
"$(cat "${pages}/readwise-reader.mdx")"
check "the sync's temporary files are gone" "" "$(ls -A "${work}/tmp")"
first="$(everything good)"
sync good
check "syncing again changes nothing" "${first}" "$(everything good)"

# A change in the working copy that is not committed is not read.
printf '%s\n' '{"schema":2}' > "${work}/good/connectors/connectors.json"
sync good
check "an uncommitted edit is ignored" 0 "${status}"
check "and the committed list is still the one copied" "$(printf '%s\n' "${good_list}")" "$(cat "${docs}/connectors.json")"

# ---------------------------------------------------------------------- refusals

refuse() { # refuse <label> <name> <expected message part>
  check "$1: stops" 1 "${status}"
  case "${out}" in *"$3"*) pass=$((pass+1)); printf '  ok    %s: says why\n' "$1" ;; *) fail=$((fail+1)); printf '  FAIL  %s: said %s\n' "$1" "${out}" ;; esac
  check "$1: nothing has changed" "${before}" "$(everything "$2")"
}

refusal() { # refusal <name> <label> <list> <message part>
  fixture "$1" "$3"
  before="$(everything "$1")"
  sync "$1"
  refuse "$2" "$1" "$4"
}

refusal bad-json "a list that is not JSON" 'not json' "is not valid JSON"
refusal schema "a list that is not schema 1" '{"schema":2,"connectors":[]}' "is not schema 1"
refusal empty "a list with no connectors" '{"schema":1,"connectors":[]}' "lists no connectors"
refusal no-name "a connector with no name" '{"schema":1,"connectors":[{"description":"x"}]}' "has no name"
refusal dup "a name listed twice" "$(printf '%s' "${good_list}" | sed 's/"name":"readwise"/"name":"todoist"/')" "lists todoist twice"
refusal mark "a mark that is not a Simple Icons ID" "$(printf '%s' "${good_list}" | sed 's/simple-icons:todoist/lucide:check/')" "is not a simple-icons ID"
refusal bool "a flag that is not a boolean" "$(printf '%s' "${good_list}" | sed 's/"carriesBack":false/"carriesBack":"no"/')" "is not true or false"
refusal types "types that are not a list" "$(printf '%s' "${good_list}" | sed 's/"types":\["todoist.task"\]/"types":"todoist.task"/')" "is not a list of type IDs"

fixture no-catalog "${good_list}"
rm "${work}/no-catalog/docs/src/generated/catalog/builtin-catalog.json"
before="$(everything no-catalog)"
sync no-catalog
refuse "no type catalog" no-catalog "Run scripts/sync-from-marfa.sh first"

fixture no-file "${good_list}"
git -C "${work}/no-file/connectors" rm -q connectors.json
git -C "${work}/no-file/connectors" -c user.name=test -c user.email=test@example.com -c commit.gpgsign=false commit -q -m remove
before="$(everything no-file)"
sync no-file
refuse "no committed list" no-file "No committed connectors.json"

fixture no-git "${good_list}"
rm -rf "${work}/no-git/connectors/.git"
before="$(everything no-git)"
sync no-git
refuse "a folder that is not a checkout" no-git "Not a git checkout"

fixture missing "${good_list}"
before="$(everything missing)"
sync missing "${work}/missing/nowhere"
refuse "a missing checkout" missing "not found"

check "no refusal left a temporary file" "" "$(ls -A "${work}/tmp")"
check "CI runs this test" 1 "$(grep -cF 'run: bash .github/scripts/sync-from-connectors.test.sh' "${here}/../workflows/ci.yml")"

printf '\nsync-from-connectors: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
