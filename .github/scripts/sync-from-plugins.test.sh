#!/usr/bin/env bash
# Runs scripts/sync-from-plugins.sh against throwaway checkouts of the docs and
# of the plugins repository, and pins what it writes and when it refuses.
#
# It copies the plugins repository's committed connectors.json into src/generated/connectors,
# writes the connector index (a table of mark, name and what each brings in, ordered
# by name) and a header for each connector (its source, its types, and whether it
# carries changes back and can be turned off), and a page for each connector that has
# none. A page that exists is never touched. A list that is missing, not committed,
# not JSON, not schema 1, empty, with a connector that lacks a field, repeats a name
# or has a mark that is not a Simple Icons ID, a docs checkout with no type
# catalog, and a plugins checkout that is not at origin/main (or at the tag
# MARFA_PLUGINS_TAG names) must stop the script before it changes anything, with one
# line saying so. It records the commit and the tag the list came from in source.json,
# leaves the folder's meta.json alone, writes a stub's description and job line from the
# list's fields so they fit the page limits, and with --relink rewrites only the index
# and the headers from the copy it already holds, against the current type catalog.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="${here}/../../scripts/sync-from-plugins.sh"

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
# writes and a page for readwise; <name>/plugins is a git checkout holding the list.
fixture() {
  local dir="${work}/$1"
  mkdir -p "${dir}/docs/scripts" "${dir}/docs/src/generated/catalog" "${dir}/docs/src/generated/connectors" "${dir}/docs/content/docs/catalog/connectors" "${dir}/plugins"
  cp "${script}" "${dir}/docs/scripts/sync-from-plugins.sh"
  printf '%s\n' "${catalog}" > "${dir}/docs/src/generated/catalog/builtin-catalog.json"
  printf 'stale list\n' > "${dir}/docs/src/generated/connectors/connectors.json"
  printf 'stale old connector\n' > "${dir}/docs/src/generated/connectors/old.md"
  printf 'hand-written readwise\n' > "${dir}/docs/content/docs/catalog/connectors/readwise.mdx"
  printf '{\n  "title": "Connectors",\n  "defaultOpen": false\n}\n' > "${dir}/docs/content/docs/catalog/connectors/meta.json"
  printf '%s\n' "$2" > "${dir}/plugins/connectors.json"
  git init -q --bare -b main "${dir}/origin.git"
  git -C "${dir}/plugins" init -q -b main
  git -C "${dir}/plugins" remote add origin "${dir}/origin.git"
  git -C "${dir}/plugins" add -A
  commit "$1" fixture
  git -C "${dir}/plugins" push -q origin main
}

# commit <name> <message>: a commit in the fixture's plugins checkout.
commit() {
  git -C "${work}/$1/plugins" -c user.name=test -c user.email=test@example.com -c commit.gpgsign=false commit -q -m "$2"
}

everything() {
  (cd "${work}/$1/docs" && find . -type f -not -path './scripts/*' | sort | while read -r file; do
    printf '== %s\n' "${file}"
    cat "${file}"
  done)
}

sync() { # sync <name> [plugins root]
  status=0
  out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${2:-${work}/$1/plugins}" bash "${work}/$1/docs/scripts/sync-from-plugins.sh" 2>&1)" || status=$?
}

# ------------------------------------------------------------------ a good list

fixture good "${good_list}"
sync good
check "a good list syncs" 0 "${status}"
docs="${work}/good/docs/src/generated/connectors"
check "the list is copied whole" "$(printf '%s\n' "${good_list}")" "$(cat "${docs}/connectors.json")"
check "the stale file is gone" "no" "$([ -e "${docs}/old.md" ] && echo yes || echo no)"
check "the index is ordered as the sidebar is, by file name, with the mark as code, aligned, a pipe escaped" \
'| Mark                   | Connector                                              | Brings in          |
| ---------------------- | ------------------------------------------------------ | ------------------ |
|                        | [Readwise Reader](/catalog/connectors/readwise-reader) | Reader documents.  |
|                        | [Readwise](/catalog/connectors/readwise)               | Sources.           |
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
check "a connector with no page gets one, keyed by its name, with a generated description and job line, holding its header" \
'---
title: "Readwise Reader"
description: "The source, the types and what carries back for the Readwise Reader connector."
job: "A reader considering Readwise Reader learns which types the connector brings in and whether it carries changes back to Readwise."
---

<include cwd>src/generated/connectors/readwise-reader.md</include>' \
"$(cat "${pages}/readwise-reader.mdx")"
check "the sync's temporary files are gone" "" "$(ls -A "${work}/tmp")"
first="$(everything good)"
sync good
check "syncing again changes nothing" "${first}" "$(everything good)"

# A change in the working copy that is not committed is not read.
printf '%s\n' '{"schema":2}' > "${work}/good/plugins/connectors.json"
sync good
check "an uncommitted edit is ignored" 0 "${status}"
check "and the committed list is still the one copied" "$(printf '%s\n' "${good_list}")" "$(cat "${docs}/connectors.json")"

# Where the list came from.
head_commit="$(git -C "${work}/good/plugins" rev-parse HEAD)"
check "source.json records the plugins commit, and no tag when none names it" \
"{
  \"repository\": \"withmarfa/plugins\",
  \"commit\": \"${head_commit}\",
  \"tag\": null
}" "$(cat "${docs}/source.json")"
check "the folder's meta.json is left as it was" '{
  "title": "Connectors",
  "defaultOpen": false
}' "$(cat "${pages}/meta.json")"

# A stub's description and job line are written from the list's fields, and fit the limits
# (40 and 30 words) however long the connector's own description is.
long_description="$(printf 'word %.0s' $(seq 1 80))"
fixture stub "$(printf '%s' "${good_list}" | sed "s/Reader documents\./${long_description}/")"
sync stub
check "a stub for a connector with a long description syncs" 0 "${status}"
stub="${work}/stub/docs/content/docs/catalog/connectors/readwise-reader.mdx"
stub_description="$(sed -n 's/^description: "\(.*\)"$/\1/p' "${stub}")"
stub_job="$(sed -n 's/^job: "\(.*\)"$/\1/p' "${stub}")"
check "the stub's description is not the long one" "no" "$(case "${stub_description}" in *word\ word*) echo yes ;; *) echo no ;; esac)"
check "the stub's description is at most 40 words" "yes" "$([ "$(printf '%s' "${stub_description}" | wc -w)" -le 40 ] && echo yes || echo no)"
check "the stub has a job line of at most 30 words" "yes" "$([ -n "${stub_job}" ] && [ "$(printf '%s' "${stub_job}" | wc -w)" -le 30 ] && echo yes || echo no)"

# A tag names the commit.
fixture tagged "${good_list}"
git -C "${work}/tagged/plugins" tag v0.0.9
git -C "${work}/tagged/plugins" push -q origin v0.0.9
sync tagged
check "a commit that a release tag names syncs" 0 "${status}"
check "and source.json records the tag" '  "tag": "v0.0.9"' "$(grep '"tag"' "${work}/tagged/docs/src/generated/connectors/source.json")"

# A tag can be named, and the checkout must be at it, even when main has moved on.
fixture release "${good_list}"
git -C "${work}/release/plugins" tag v0.0.7
git -C "${work}/release/plugins" push -q origin v0.0.7
printf '%s\n' "$(printf '%s' "${good_list}" | sed 's/Sources\./Sources and more./')" > "${work}/release/plugins/connectors.json"
git -C "${work}/release/plugins" add -A
commit release later
git -C "${work}/release/plugins" push -q origin main
git -C "${work}/release/plugins" checkout -q v0.0.7
status=0
out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${work}/release/plugins" MARFA_PLUGINS_TAG=v0.0.7 bash "${work}/release/docs/scripts/sync-from-plugins.sh" 2>&1)" || status=$?
check "a checkout at the named tag syncs, though main has moved on" 0 "${status}"
check "and the list is the tag's" "$(printf '%s\n' "${good_list}")" "$(cat "${work}/release/docs/src/generated/connectors/connectors.json")"

# --relink rewrites the headers and the index against the current type catalog, from the
# copy the docs hold, and reads no checkout.
fixture relink "${good_list}"
sync relink
before_relink="$(everything relink)"
printf '%s\n' '{"types":[{"id":"core.note"},{"id":"readwise.source"}]}' > "${work}/relink/docs/src/generated/catalog/builtin-catalog.json"
status=0
out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${work}/relink/nowhere" bash "${work}/relink/docs/scripts/sync-from-plugins.sh" --relink 2>&1)" || status=$?
check "a relink needs no checkout" 0 "${status}"
check "a relink links a type the catalog now has a page for" \
'- **Source:** `readwise`, shown as Readwise
- **Types:** [`readwise.source`](/catalog/source), [`core.note`](/catalog/note)
- **Carries changes back:** Yes, for [`core.note`](/catalog/note)
- **Can be turned off:** No' \
"$(cat "${work}/relink/docs/src/generated/connectors/readwise-reader.md")"
check "and leaves the list, where it came from, the pages and the sidebar alone" \
"$(printf '%s' "${before_relink}" | awk '/^== \.\/(src\/generated\/connectors\/(connectors|source)\.json|content\/)/{p=1;next} /^== /{p=0} p')" \
"$(everything relink | awk '/^== \.\/(src\/generated\/connectors\/(connectors|source)\.json|content\/)/{p=1;next} /^== /{p=0} p')"
rm -f "${work}/relink/docs/src/generated/connectors/connectors.json"
status=0
out="$(TMPDIR="${work}/tmp" bash "${work}/relink/docs/scripts/sync-from-plugins.sh" --relink 2>&1)" || status=$?
check "a relink with no copy of the list stops" 1 "${status}"
case "${out}" in *"Run scripts/sync-from-plugins.sh first"*) pass=$((pass+1)); printf '  ok    a relink with no copy says why\n' ;; *) fail=$((fail+1)); printf '  FAIL  a relink with no copy said %s\n' "${out}" ;; esac

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

fixture ahead "${good_list}"
printf '%s\n' '{"schema":1,"connectors":[]}' > "${work}/ahead/plugins/connectors.json"
git -C "${work}/ahead/plugins" add -A
commit ahead unmerged
before="$(everything ahead)"
sync ahead
refuse "a checkout with a commit origin/main lacks" ahead "is not at origin/main"

fixture behind "${good_list}"
git -C "${work}/behind/plugins" checkout -q -b elsewhere
printf '%s\n' "${good_list}" > "${work}/behind/plugins/connectors.json"
git -C "${work}/behind/plugins" checkout -q main
git -C "${work}/behind/plugins" clone -q "${work}/behind/origin.git" "${work}/behind/other"
printf '%s\n' "$(printf '%s' "${good_list}" | sed 's/Sources\./Newer./')" > "${work}/behind/other/connectors.json"
git -C "${work}/behind/other" add -A
git -C "${work}/behind/other" -c user.name=test -c user.email=test@example.com -c commit.gpgsign=false commit -q -m newer
git -C "${work}/behind/other" push -q origin main
before="$(everything behind)"
sync behind
refuse "a checkout behind origin/main" behind "is not at origin/main"

fixture branch "${good_list}"
git -C "${work}/branch/plugins" checkout -q -b feature
printf '%s\n' "$(printf '%s' "${good_list}" | sed 's/Sources\./Branch./')" > "${work}/branch/plugins/connectors.json"
git -C "${work}/branch/plugins" add -A
commit branch feature
before="$(everything branch)"
sync branch
refuse "a checkout on a branch" branch "is not at origin/main"

fixture no-origin "${good_list}"
git -C "${work}/no-origin/plugins" remote remove origin
before="$(everything no-origin)"
sync no-origin
refuse "a checkout whose origin cannot be fetched" no-origin "Could not fetch origin"

fixture wrong-tag "${good_list}"
git -C "${work}/wrong-tag/plugins" tag v0.0.1
printf '%s\n' "${good_list} " > "${work}/wrong-tag/plugins/connectors.json"
git -C "${work}/wrong-tag/plugins" add -A
commit wrong-tag later
git -C "${work}/wrong-tag/plugins" push -q origin main
before="$(everything wrong-tag)"
status=0
out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${work}/wrong-tag/plugins" MARFA_PLUGINS_TAG=v0.0.1 bash "${work}/wrong-tag/docs/scripts/sync-from-plugins.sh" 2>&1)" || status=$?
refuse "a checkout not at the tag named" wrong-tag "is not at v0.0.1"

fixture no-tag "${good_list}"
before="$(everything no-tag)"
status=0
out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${work}/no-tag/plugins" MARFA_PLUGINS_TAG=v9.9.9 bash "${work}/no-tag/docs/scripts/sync-from-plugins.sh" 2>&1)" || status=$?
refuse "a tag that does not exist" no-tag "No tag v9.9.9"

fixture bad-arg "${good_list}"
before="$(everything bad-arg)"
status=0
out="$(TMPDIR="${work}/tmp" bash "${work}/bad-arg/docs/scripts/sync-from-plugins.sh" --nope 2>&1)" || status=$?
refuse "an argument the script does not know" bad-arg "Unknown argument"

fixture no-catalog "${good_list}"
rm "${work}/no-catalog/docs/src/generated/catalog/builtin-catalog.json"
before="$(everything no-catalog)"
sync no-catalog
refuse "no type catalog" no-catalog "Run scripts/sync-from-marfa.sh first"

fixture no-file "${good_list}"
git -C "${work}/no-file/plugins" rm -q connectors.json
commit no-file remove
git -C "${work}/no-file/plugins" push -q origin main
before="$(everything no-file)"
sync no-file
refuse "no committed list" no-file "No committed connectors.json"

fixture no-git "${good_list}"
rm -rf "${work}/no-git/plugins/.git"
before="$(everything no-git)"
sync no-git
refuse "a folder that is not a checkout" no-git "Not a git checkout"

fixture missing "${good_list}"
before="$(everything missing)"
sync missing "${work}/missing/nowhere"
refuse "a missing checkout" missing "not found"

check "no refusal left a temporary file" "" "$(ls -A "${work}/tmp")"
check "CI runs this test" 1 "$(grep -cF 'run: bash .github/scripts/sync-from-plugins.test.sh' "${here}/../workflows/ci.yml")"

printf '\nsync-from-plugins: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
