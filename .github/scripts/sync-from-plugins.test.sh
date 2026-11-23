#!/usr/bin/env bash
# Runs scripts/sync-from-plugins.sh against throwaway checkouts of the docs and
# of the plugins repository, and pins what it writes and when it refuses.
#
# It reads connectors/<name>/plugin/plugin.json as committed, derives the list the docs
# hold into src/generated/connectors (a connector carries changes back when a kind has the
# direction out or both, and carries those kinds' types), writes the connector index (a
# table of mark, name and what each brings in, ordered by file name) and a header for each
# connector (its source, its types and what it can carry back), and a page for each
# connector that has none. A page that exists is never touched. A checkout with no
# manifest, a manifest that is not JSON, lacks a field, names another folder, has a
# direction or mark it does not know or repeats a type, a docs checkout with no type
# catalog, and a plugins checkout that is not at origin/main (or at the tag
# MARFA_PLUGINS_TAG names) must stop the script before it changes anything, with one
# line saying so. It records the commit and the tag in source.json, leaves the folder's
# meta.json alone, writes a stub's description and job line from the connector's title and
# source name so they fit the page limits, and with --relink rewrites only the index and
# the headers from the list it already holds, against the current type catalog.
# It also reads types/<name>/ the way the plugins repository lists a family: a
# folder with plugin.json is a family, a folder without one is refused, and a
# file of types/ other than README.md is refused. It writes a header for each
# family (its types, with their kinds or groups, status words, guidance and the
# plugin version) and one list of every plugin, each row a connector, a type
# family or both, with no count. A malformed family stops the script before it
# writes anything.
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

# Three connectors: a source of its own with a mark, two with one source and a lucide
# mark or none, one that carries back and two that do not.
manifest() { # manifest <name> <title> <description> <source> <source name> <mark or empty> <kinds>
  local mark=""
  [ -n "$6" ] && mark="\"mark\":\"$6\","
  printf '{"name":"%s","title":"%s","description":"%s",%s"maker":"WithMarfa","marfa":"0.0.95","connector":{"source":"%s","source_name":"%s","kinds":%s,"settings":[],"runs":{"on":"host"}}}\n' \
    "$1" "$2" "$3" "${mark}" "$4" "$5" "$7"
}
todoist_manifest="$(manifest todoist Todoist 'Tasks | and more.' todoist Todoist simple-icons:todoist '[{"name":"task","type":"todoist.task","direction":"both"}]')"
reader_manifest="$(manifest reader 'Readwise Reader' 'Reader documents.' readwise Readwise lucide:book-open '[{"name":"source","type":"readwise.source","direction":"in"},{"name":"note","type":"core.note","direction":"out"}]')"
readwise_manifest="$(manifest readwise Readwise 'Sources.' readwise Readwise '' '[{"name":"source","type":"readwise.source","direction":"in"}]')"
good_list="$(printf '%s\n' \
  '{"schema":2,"connectors":[' \
  '  {"directory":"connectors/reader","name":"reader","title":"Readwise Reader","description":"Reader documents.","source":"readwise","sourceName":"Readwise","mark":"lucide:book-open","types":["readwise.source","core.note"],"carriesBack":true,"carriedTypes":["core.note"]},' \
  '  {"directory":"connectors/readwise","name":"readwise","title":"Readwise","description":"Sources.","source":"readwise","sourceName":"Readwise","types":["readwise.source"],"carriesBack":false,"carriedTypes":[]},' \
  '  {"directory":"connectors/todoist","name":"todoist","title":"Todoist","description":"Tasks | and more.","source":"todoist","sourceName":"Todoist","mark":"simple-icons:todoist","types":["todoist.task"],"carriesBack":true,"carriedTypes":["todoist.task"]}' \
  ']}' | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2))')"

good="$(printf 'reader %s\nreadwise %s\ntodoist %s\n' "${reader_manifest}" "${readwise_manifest}" "${todoist_manifest}")"

catalog='{"types":[{"id":"core.note"},{"id":"core.media"},{"id":"core.media.film"},{"id":"system.view"}]}'

# fixture <name> <manifests>: <name>/docs holds the script, a stale copy of what it
# writes and a page for readwise; <name>/plugins is a git checkout holding the
# connectors' manifests, one connector per line of <manifests> as "<folder> <json>".
fixture() {
  local dir="${work}/$1"
  mkdir -p "${dir}/docs/scripts" "${dir}/docs/src/generated/catalog" "${dir}/docs/src/generated/connectors" "${dir}/docs/content/docs/catalog/connectors" "${dir}/plugins"
  cp "${script}" "${dir}/docs/scripts/sync-from-plugins.sh"
  printf '%s\n' "${catalog}" > "${dir}/docs/src/generated/catalog/builtin-catalog.json"
  printf 'stale list\n' > "${dir}/docs/src/generated/connectors/connectors.json"
  printf 'stale old connector\n' > "${dir}/docs/src/generated/connectors/old.md"
  printf 'hand-written readwise\n' > "${dir}/docs/content/docs/catalog/connectors/readwise.mdx"
  printf '{\n  "title": "Connectors",\n  "defaultOpen": false\n}\n' > "${dir}/docs/content/docs/catalog/connectors/meta.json"
  put "$1" "$2"
  git init -q --bare -b main "${dir}/origin.git"
  git -C "${dir}/plugins" init -q -b main
  git -C "${dir}/plugins" remote add origin "${dir}/origin.git"
  git -C "${dir}/plugins" add -A
  commit "$1" fixture
  git -C "${dir}/plugins" push -q origin main
}

# put <name> <manifests>: write each "<folder> <json>" line as that connector's manifest.
put() {
  local line folder
  while IFS= read -r line; do
    [ -n "${line}" ] || continue
    folder="${line%% *}"
    mkdir -p "${work}/$1/plugins/connectors/${folder}/plugin"
    printf '%s\n' "${line#* }" > "${work}/$1/plugins/connectors/${folder}/plugin/plugin.json"
  done <<< "$2"
}

# commit <name> <message>: a commit in the fixture's plugins checkout.
commit() {
  git -C "${work}/$1/plugins" -c user.name=test -c user.email=test@example.com -c commit.gpgsign=false commit -q -m "$2"
}

# publish <name> <message>: commit the plugins checkout and push it, so HEAD is origin/main.
publish() {
  git -C "${work}/$1/plugins" add -A
  commit "$1" "$2"
  git -C "${work}/$1/plugins" push -q origin main
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

fixture good "${good}"
sync good
check "a good list syncs" 0 "${status}"
docs="${work}/good/docs/src/generated/connectors"
check "the list is derived from the manifests" "${good_list}" "$(cat "${docs}/connectors.json")"
check "the stale file is gone" "no" "$([ -e "${docs}/old.md" ] && echo yes || echo no)"
check "the index is ordered as the sidebar is, by file name, with a lucide or simple-icons mark as code, aligned, a pipe escaped" \
'| Mark                   | Connector                                     | Brings in          |
| ---------------------- | --------------------------------------------- | ------------------ |
| `lucide:book-open`     | [Readwise Reader](/catalog/connectors/reader) | Reader documents.  |
|                        | [Readwise](/catalog/connectors/readwise)      | Sources.           |
| `simple-icons:todoist` | [Todoist](/catalog/connectors/todoist)        | Tasks \| and more. |' \
"$(cat "${docs}/index.md")"
check "the plugin list names each connector and no family, with no count" \
'| Mark                   | Plugin                                        | What it is | Brings in          |
| ---------------------- | --------------------------------------------- | ---------- | ------------------ |
| `lucide:book-open`     | [Readwise Reader](/catalog/connectors/reader) | Connector  | Reader documents.  |
|                        | [Readwise](/catalog/connectors/readwise)      | Connector  | Sources.           |
| `simple-icons:todoist` | [Todoist](/catalog/connectors/todoist)        | Connector  | Tasks \| and more. |' \
"$(cat "${docs}/../plugins/index.md")"
check "a header names source, types and what can be carried back, links a type with a Catalog page, and says nothing on turning it off" \
'- **Source:** `readwise`, shown as Readwise
- **Types:** `readwise.source`, [`core.note`](/catalog/note)
- **Can carry changes back:** Yes, for [`core.note`](/catalog/note)' \
"$(cat "${docs}/reader.md")"
check "a connector with only inbound kinds says it cannot carry changes back" \
'- **Source:** `readwise`, shown as Readwise
- **Types:** `readwise.source`
- **Can carry changes back:** No' \
"$(cat "${docs}/readwise.md")"
pages="${work}/good/docs/content/docs/catalog/connectors"
check "a page that exists is left as it was" "hand-written readwise" "$(cat "${pages}/readwise.mdx")"
check "a connector with no page gets one, keyed by its name, with a generated description and job line, holding its header" \
'---
title: "Readwise Reader"
description: "The source, the types and what carries back for the Readwise Reader connector."
job: "A reader considering Readwise Reader learns which types the connector brings in and whether it carries changes back to Readwise."
---

<include cwd>src/generated/connectors/reader.md</include>' \
"$(cat "${pages}/reader.mdx")"
check "the sync's temporary files are gone" "" "$(ls -A "${work}/tmp")"
first="$(everything good)"
sync good
check "syncing again changes nothing" "${first}" "$(everything good)"

# A change in the working copy that is not committed is not read.
printf '%s\n' '{"name":"todoist"}' > "${work}/good/plugins/connectors/todoist/plugin/plugin.json"
mkdir -p "${work}/good/plugins/connectors/uncommitted/plugin"
printf 'not json\n' > "${work}/good/plugins/connectors/uncommitted/plugin/plugin.json"
sync good
check "an uncommitted edit and an uncommitted connector are ignored" 0 "${status}"
check "and the committed list is still the one derived" "${good_list}" "$(cat "${docs}/connectors.json")"

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
fixture stub "$(printf '%s' "${good}" | sed "s/Reader documents\./${long_description}/")"
sync stub
check "a stub for a connector with a long description syncs" 0 "${status}"
stub="${work}/stub/docs/content/docs/catalog/connectors/reader.mdx"
stub_description="$(sed -n 's/^description: "\(.*\)"$/\1/p' "${stub}")"
stub_job="$(sed -n 's/^job: "\(.*\)"$/\1/p' "${stub}")"
check "the stub's description is not the long one" "no" "$(case "${stub_description}" in *word\ word*) echo yes ;; *) echo no ;; esac)"
check "the stub's description is at most 40 words" "yes" "$([ "$(printf '%s' "${stub_description}" | wc -w)" -le 40 ] && echo yes || echo no)"
check "the stub has a job line of at most 30 words" "yes" "$([ -n "${stub_job}" ] && [ "$(printf '%s' "${stub_job}" | wc -w)" -le 30 ] && echo yes || echo no)"

# A tag names the commit.
fixture tagged "${good}"
git -C "${work}/tagged/plugins" tag v0.0.9
git -C "${work}/tagged/plugins" push -q origin v0.0.9
sync tagged
check "a commit that a release tag names syncs" 0 "${status}"
check "and source.json records the tag" '  "tag": "v0.0.9"' "$(grep '"tag"' "${work}/tagged/docs/src/generated/connectors/source.json")"

# A tag can be named, and the checkout must be at it, even when main has moved on.
fixture release "${good}"
git -C "${work}/release/plugins" tag v0.0.7
git -C "${work}/release/plugins" push -q origin v0.0.7
put release "$(printf '%s' "${good}" | sed 's/Sources\./Sources and more./')"
git -C "${work}/release/plugins" add -A
commit release later
git -C "${work}/release/plugins" push -q origin main
git -C "${work}/release/plugins" checkout -q v0.0.7
status=0
out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${work}/release/plugins" MARFA_PLUGINS_TAG=v0.0.7 bash "${work}/release/docs/scripts/sync-from-plugins.sh" 2>&1)" || status=$?
check "a checkout at the named tag syncs, though main has moved on" 0 "${status}"
check "and the list is the tag's" "${good_list}" "$(cat "${work}/release/docs/src/generated/connectors/connectors.json")"

# --relink rewrites the headers and the index against the current type catalog, from the
# copy the docs hold, and reads no checkout.
fixture relink "${good}"
sync relink
before_relink="$(everything relink)"
printf '%s\n' '{"types":[{"id":"core.note"},{"id":"readwise.source"}]}' > "${work}/relink/docs/src/generated/catalog/builtin-catalog.json"
status=0
out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${work}/relink/nowhere" bash "${work}/relink/docs/scripts/sync-from-plugins.sh" --relink 2>&1)" || status=$?
check "a relink needs no checkout" 0 "${status}"
check "a relink links a type the catalog now has a page for" \
'- **Source:** `readwise`, shown as Readwise
- **Types:** [`readwise.source`](/catalog/source), [`core.note`](/catalog/note)
- **Can carry changes back:** Yes, for [`core.note`](/catalog/note)' \
"$(cat "${work}/relink/docs/src/generated/connectors/reader.md")"
check "and leaves the list, where it came from, the pages and the sidebar alone" \
"$(printf '%s' "${before_relink}" | awk '/^== \.\/(src\/generated\/connectors\/(connectors|source)\.json|content\/)/{p=1;next} /^== /{p=0} p')" \
"$(everything relink | awk '/^== \.\/(src\/generated\/connectors\/(connectors|source)\.json|content\/)/{p=1;next} /^== /{p=0} p')"
rm -f "${work}/relink/docs/src/generated/connectors/connectors.json"
status=0
out="$(TMPDIR="${work}/tmp" bash "${work}/relink/docs/scripts/sync-from-plugins.sh" --relink 2>&1)" || status=$?
check "a relink with no copy of the list stops" 1 "${status}"
case "${out}" in *"Run scripts/sync-from-plugins.sh first"*) pass=$((pass+1)); printf '  ok    a relink with no copy says why\n' ;; *) fail=$((fail+1)); printf '  FAIL  a relink with no copy said %s\n' "${out}" ;; esac

# --------------------------------------------------------------- a type family

fixture family "${good}"
printf '%s\n' '{"types":[{"id":"core.note"},{"id":"core.task"},{"id":"core.media"},{"id":"core.media.film"},{"id":"system.view"}]}' > "${work}/family/docs/src/generated/catalog/builtin-catalog.json"
family_pages="${work}/family/docs/content/docs/catalog/(types)"
mkdir -p "${family_pages}"
printf 'hand-written tickets\n' > "${family_pages}/tickets.mdx"
printf '{\n  "title": "Types"\n}\n' > "${family_pages}/meta.json"
family_root="${work}/family/plugins/types/tickets"
mkdir -p "${family_root}/types"
printf '%s\n' '{"name":"tickets","title":"Tickets","description":"Track work.","mark":"lucide:ticket","maker":"WithMarfa","marfa":"0.0.92"}' > "${family_root}/plugin.json"
printf '%s\n' '{"id":"common.ticket","label":"Ticket","description":"Groups the kinds.","version":0,"parent":"core.task","fields":{"status":{"type":"status","description":"Where it stands.","status_values":[{"value":"backlog","group":"not_started","description":"Wanted."}]}},"display_hints":{"icon":"lucide:ticket","title_field":"title"}}' > "${family_root}/types/common.ticket.json"
printf '%s\n' '**Use for:** every ticket.' > "${family_root}/types/common.ticket.md"
printf '%s\n' '{"id":"common.ticket.task","label":"Task","description":"Other work.","version":0,"parent":"common.ticket","fields":{},"display_hints":{"icon":"lucide:wrench"}}' > "${family_root}/types/common.ticket.task.json"
printf '%s\n' '**Use for:** other work.' > "${family_root}/types/common.ticket.task.md"
publish family 'add tickets'
sync family
check "a family syncs" 0 "${status}"
check "a family header names the family, its version, its types with their kind or group, status words, guidance and a hint" \
'- **Family:** Tickets (`tickets`)
- **Version:** none
- **Mark:** `lucide:ticket`
- **Maker:** WithMarfa
- **Oldest Marfa:** 0.0.92
- **Description:** Track work.

## Types

| Type                 | Label  | Kind or group | Parent                       | Mark            | Description       |
| -------------------- | ------ | ------------- | ---------------------------- | --------------- | ----------------- |
| `common.ticket`      | Ticket | group         | [`core.task`](/catalog/task) | `lucide:ticket` | Groups the kinds. |
| `common.ticket.task` | Task   | kind          | `common.ticket`              | `lucide:wrench` | Other work.       |

## Fields

| Type            | Field    | Kind     | Description      |
| --------------- | -------- | -------- | ---------------- |
| `common.ticket` | `status` | `status` | Where it stands. |

## Status words

| Type            | Word      | Group         | Description |
| --------------- | --------- | ------------- | ----------- |
| `common.ticket` | `backlog` | `not_started` | Wanted.     |

## Display hints

| Type            | Hint          | Value   |
| --------------- | ------------- | ------- |
| `common.ticket` | `title_field` | `title` |

## Guidance

### `common.ticket`

**Use for:** every ticket.

### `common.ticket.task`

**Use for:** other work.' \
"$(cat "${work}/family/docs/src/generated/plugins/tickets.md")"
check "the plugin list adds the family, with no count" \
'| Mark                   | Plugin                                        | What it is  | Brings in          |
| ---------------------- | --------------------------------------------- | ----------- | ------------------ |
| `lucide:book-open`     | [Readwise Reader](/catalog/connectors/reader) | Connector   | Reader documents.  |
|                        | [Readwise](/catalog/connectors/readwise)      | Connector   | Sources.           |
| `lucide:ticket`        | [Tickets](/catalog/tickets)                   | Type family | Track work.        |
| `simple-icons:todoist` | [Todoist](/catalog/connectors/todoist)        | Connector   | Tasks \| and more. |' \
"$(cat "${work}/family/docs/src/generated/plugins/index.md")"
check "a family page that exists is left as it was" "hand-written tickets" "$(cat "${family_pages}/tickets.mdx")"
check "the types folder meta.json is left as it was" '{
  "title": "Types"
}' "$(cat "${family_pages}/meta.json")"
mkdir -p "${work}/family/plugins/types/extra"
printf '%s\n' '{"name":"extra","title":"Extra","description":"No.","mark":"lucide:box","maker":"WithMarfa","marfa":"0.0.92"}' > "${work}/family/plugins/types/extra/plugin.json"
sync family
check "an uncommitted family is ignored" 0 "${status}"
check "and the committed family is still the only one" "tickets" "$(python3 -c 'import json,sys; print(" ".join(f["name"] for f in json.load(open(sys.argv[1]))["families"]))' "${work}/family/docs/src/generated/plugins/families.json")"
git -C "${work}/family/plugins" tag v0.0.4
git -C "${work}/family/plugins" push -q origin v0.0.4
sync family
check "a release tag is the plugin version" "- **Version:** 0.0.4" "$(grep -F '**Version:**' "${work}/family/docs/src/generated/plugins/tickets.md")"

# A family whose plugin.json has a connector section is both, not a second plugin.
fixture both "$(printf 'reader %s\n' "${reader_manifest}")"
both_root="${work}/both/plugins/types/ledger"
mkdir -p "${both_root}/types"
printf '%s\n' '{"name":"ledger","title":"Ledger","description":"Money.","mark":"lucide:wallet","maker":"WithMarfa","marfa":"0.0.92","connector":{"source":"ledger"}}' > "${both_root}/plugin.json"
printf '%s\n' '{"id":"common.ledger","label":"Ledger","description":"Money.","version":0,"fields":{},"display_hints":{"icon":"lucide:wallet"}}' > "${both_root}/types/common.ledger.json"
printf '%s\n' 'Money.' > "${both_root}/types/common.ledger.md"
publish both ledger
sync both
check "a family with a connector section syncs" 0 "${status}"
check "and its row says both" \
'| Mark               | Plugin                                        | What it is | Brings in         |
| ------------------ | --------------------------------------------- | ---------- | ----------------- |
| `lucide:wallet`    | [Ledger](/catalog/ledger)                     | Both       | Money.            |
| `lucide:book-open` | [Readwise Reader](/catalog/connectors/reader) | Connector  | Reader documents. |' \
"$(cat "${work}/both/docs/src/generated/plugins/index.md")"

# A family with no page gets one. A page that exists is covered above.
fixture family-stub "$(printf 'reader %s\n' "${reader_manifest}")"
stub_root="${work}/family-stub/plugins/types/labels"
mkdir -p "${stub_root}/types"
printf '%s\n' '{"name":"labels","title":"Labels","description":"Names.","mark":"lucide:tag","maker":"WithMarfa","marfa":"0.0.92"}' > "${stub_root}/plugin.json"
printf '%s\n' '{"id":"common.label","label":"Label","description":"A name.","version":0,"fields":{},"display_hints":{"icon":"lucide:tag"}}' > "${stub_root}/types/common.label.json"
printf '%s\n' 'A name.' > "${stub_root}/types/common.label.md"
publish family-stub labels
sync family-stub
check "a family with no page gets one, holding its header" \
'---
title: "Labels"
description: "The types the Labels plugin adds."
job: "A reader considering Labels learns which types the plugin adds, and their status words and guidance."
---

<include cwd>src/generated/plugins/labels.md</include>' \
"$(cat "${work}/family-stub/docs/content/docs/catalog/(types)/labels.mdx")"

# --relink rewrites a family header's type links from the catalog, and not the stored family.
fixture family-link "${good}"
link_root="${work}/family-link/plugins/types/tickets"
mkdir -p "${link_root}/types"
printf '%s\n' '{"name":"tickets","title":"Tickets","description":"Track work.","mark":"lucide:ticket","maker":"WithMarfa","marfa":"0.0.92"}' > "${link_root}/plugin.json"
printf '%s\n' '{"id":"common.ticket","label":"Ticket","description":"Groups the kinds.","version":0,"parent":"core.task","fields":{},"display_hints":{"icon":"lucide:ticket"}}' > "${link_root}/types/common.ticket.json"
printf '%s\n' 'Every ticket.' > "${link_root}/types/common.ticket.md"
publish family-link 'link family'
sync family-link
link_header="${work}/family-link/docs/src/generated/plugins/tickets.md"
check "a parent with no Catalog page stays code" 0 "$(grep -cF '[`core.task`](/catalog/task)' "${link_header}" || true)"
stored="$(cat "${work}/family-link/docs/src/generated/plugins/families.json")"
printf '%s\n' '{"types":[{"id":"core.task"}]}' > "${work}/family-link/docs/src/generated/catalog/builtin-catalog.json"
status=0
out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${work}/family-link/nowhere" bash "${work}/family-link/docs/scripts/sync-from-plugins.sh" --relink 2>&1)" || status=$?
check "a relink of a family needs no checkout" 0 "${status}"
check "a relink links a family's parent when the catalog gains its page" 1 "$(grep -cF '[`core.task`](/catalog/task)' "${link_header}" || true)"
check "a relink leaves the stored family as it was" "${stored}" "$(cat "${work}/family-link/docs/src/generated/plugins/families.json")"

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

refusal bad-json "a manifest that is not JSON" "$(printf '%s' "${good}" | sed 's/^todoist .*/todoist not json/')" "connectors/todoist/plugin/plugin.json is not valid JSON"
refusal no-title "a manifest with no title" "$(printf '%s' "${good}" | sed 's/"title":"Todoist",//')" "plugin.json has no title"
refusal other-name "a manifest named for another folder" "$(printf '%s' "${good}" | sed 's/^todoist {"name":"todoist"/todoist {"name":"tasks"/')" "is named tasks, not for its folder"
refusal mark "a mark that is not a simple-icons or lucide ID" "$(printf '%s' "${good}" | sed 's/simple-icons:todoist/emoji:check/')" "has a mark that is not a simple-icons or lucide ID"
refusal no-section "a manifest with no connector section" "$(printf '%s' "${good}" | sed 's/"connector":{/"other":{/')" "has no connector section"
refusal no-source "a manifest with no source" "$(printf '%s' "${good}" | sed 's/"source":"todoist",//')" "has no connector source"
refusal no-kinds "a manifest with no kinds" "$(printf '%s' "${good}" | sed 's/"kinds":\[{"name":"task","type":"todoist.task","direction":"both"}\]/"kinds":[]/')" "has no kinds"
refusal direction "a direction it does not know" "$(printf '%s' "${good}" | sed 's/"direction":"both"/"direction":"sideways"/')" "whose direction is not in, out or both"
refusal type "a type that is not a type ID" "$(printf '%s' "${good}" | sed 's/todoist\.task/Todoist-Task/')" "has a kind with no type ID"
refusal twice "a type listed twice" "$(printf '%s' "${good}" | sed 's/"type":"core.note"/"type":"readwise.source"/')" "lists readwise.source twice"

fixture bad-family "${good}"
mkdir -p "${work}/bad-family/plugins/types/broken"
printf 'not json\n' > "${work}/bad-family/plugins/types/broken/plugin.json"
publish bad-family 'bad family'
before="$(everything bad-family)"
sync bad-family
refuse "a family manifest that is not JSON" bad-family "types/broken/plugin.json is not valid JSON"

fixture orphan-family "${good}"
mkdir -p "${work}/orphan-family/plugins/types/orphan"
printf 'notes\n' > "${work}/orphan-family/plugins/types/orphan/readme.txt"
publish orphan-family orphan
before="$(everything orphan-family)"
sync orphan-family
refuse "a family folder with no plugin.json" orphan-family "types/orphan: holds no plugin.json"

fixture none "${good}"
git -C "${work}/none/plugins" rm -q -r connectors
commit none remove
git -C "${work}/none/plugins" push -q origin main
before="$(everything none)"
sync none
refuse "a checkout with no connector manifest" none "No connectors/<name>/plugin/plugin.json committed"

fixture ahead "${good}"
put ahead 'todoist {}'
git -C "${work}/ahead/plugins" add -A
commit ahead unmerged
before="$(everything ahead)"
sync ahead
refuse "a checkout with a commit origin/main lacks" ahead "is not at origin/main"

fixture behind "${good}"
git -C "${work}/behind/plugins" clone -q "${work}/behind/origin.git" "${work}/behind/other"
printf '%s\n' "${todoist_manifest} " > "${work}/behind/other/connectors/todoist/plugin/plugin.json"
git -C "${work}/behind/other" add -A
git -C "${work}/behind/other" -c user.name=test -c user.email=test@example.com -c commit.gpgsign=false commit -q -m newer
git -C "${work}/behind/other" push -q origin main
before="$(everything behind)"
sync behind
refuse "a checkout behind origin/main" behind "is not at origin/main"

fixture branch "${good}"
git -C "${work}/branch/plugins" checkout -q -b feature
put branch "$(printf '%s' "${good}" | sed 's/Sources\./Branch./')"
git -C "${work}/branch/plugins" add -A
commit branch feature
before="$(everything branch)"
sync branch
refuse "a checkout on a branch" branch "is not at origin/main"

fixture no-origin "${good}"
git -C "${work}/no-origin/plugins" remote remove origin
before="$(everything no-origin)"
sync no-origin
refuse "a checkout whose origin cannot be fetched" no-origin "Could not fetch origin"

fixture wrong-tag "${good}"
git -C "${work}/wrong-tag/plugins" tag v0.0.1
put wrong-tag "$(printf '%s' "${good}" | sed 's/Sources\./Later./')"
git -C "${work}/wrong-tag/plugins" add -A
commit wrong-tag later
git -C "${work}/wrong-tag/plugins" push -q origin main
before="$(everything wrong-tag)"
status=0
out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${work}/wrong-tag/plugins" MARFA_PLUGINS_TAG=v0.0.1 bash "${work}/wrong-tag/docs/scripts/sync-from-plugins.sh" 2>&1)" || status=$?
refuse "a checkout not at the tag named" wrong-tag "is not at v0.0.1"

fixture no-tag "${good}"
before="$(everything no-tag)"
status=0
out="$(TMPDIR="${work}/tmp" MARFA_PLUGINS_ROOT="${work}/no-tag/plugins" MARFA_PLUGINS_TAG=v9.9.9 bash "${work}/no-tag/docs/scripts/sync-from-plugins.sh" 2>&1)" || status=$?
refuse "a tag that does not exist" no-tag "No tag v9.9.9"

fixture bad-arg "${good}"
before="$(everything bad-arg)"
status=0
out="$(TMPDIR="${work}/tmp" bash "${work}/bad-arg/docs/scripts/sync-from-plugins.sh" --nope 2>&1)" || status=$?
refuse "an argument the script does not know" bad-arg "Unknown argument"

fixture no-catalog "${good}"
rm "${work}/no-catalog/docs/src/generated/catalog/builtin-catalog.json"
before="$(everything no-catalog)"
sync no-catalog
refuse "no type catalog" no-catalog "Run scripts/sync-from-marfa.sh first"

fixture no-git "${good}"
rm -rf "${work}/no-git/plugins/.git"
before="$(everything no-git)"
sync no-git
refuse "a folder that is not a checkout" no-git "Not a git checkout"

fixture missing "${good}"
before="$(everything missing)"
sync missing "${work}/missing/nowhere"
refuse "a missing checkout" missing "not found"

check "no refusal left a temporary file" "" "$(ls -A "${work}/tmp")"
check "CI runs this test" 1 "$(grep -cF 'run: bash .github/scripts/sync-from-plugins.test.sh' "${here}/../workflows/ci.yml")"

printf '\nsync-from-plugins: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
