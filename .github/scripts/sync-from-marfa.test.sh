#!/usr/bin/env bash
# Runs scripts/sync-from-marfa.sh against throwaway checkouts of the docs and of
# the monorepo, and pins what it writes and when it refuses.
#
# The parts that need a test are the two files the script rewrites rather than
# copies. It turns the spec's info.description into
# src/generated/api-overview.md, moving each heading down a level, and the
# command reference into src/generated/marfa-commands.md, dropping its
# generated-file comment and its title, and it takes the code table from the
# errors chapter into src/generated/error-codes.md and the settings table from
# the instance chapter into src/generated/settings.md, and the tables of the
# shipped types, edge types, permissions and event types from their chapters
# into src/generated/core-types.md, edge-types.md, permissions.md and
# event-types.md. A description that is missing, blank or
# the wrong type, a spec whose top level or `info` is not an object, or a
# command reference that is missing, empty, not UTF-8 or holds nothing past its
# title, or a chapter with no table between its markers, must stop the
# script before it changes anything, with one line saying
# so, never a Python traceback. The script is copied into each fixture so that
# its docs root is the fixture, and the real tree is never touched.
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

# The command reference every fixture holds: the generated-file comment, the
# title, the intro and one root command, with a `#` inside a fence that must
# survive.
commands="$(cat <<'EOF'
<!-- Generated from the command tree. Do not edit by hand. -->

# marfa command reference

Global options, which every command accepts, and the exit codes:

```text
Usage: marfa [OPTIONS] <COMMAND>
```

## status

### marfa status

```text
# not a heading
Usage: marfa status [OPTIONS]
```

EOF
)"
commands_expected="$(cat <<'EOF'
Global options, which every command accepts, and the exit codes:

```text
Usage: marfa [OPTIONS] <COMMAND>
```

## status

### marfa status

```text
# not a heading
Usage: marfa status [OPTIONS]
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
# takes from each. <chapter> <marker> <output file> <noun> <header line>.
catalogue_chapter() { # catalogue_chapter <marker> <header> <row>
  printf '# Chapter\n\n<!-- %s-table:start -->\n\n%s\n| --- | --- |\n%s\n\n<!-- %s-table:end -->\n' "$1" "$2" "$3" "$1"
}
catalogue_expected() { # catalogue_expected <header> <row>
  printf '%s\n| --- | --- |\n%s' "$1" "$2"
}
types_chapter="$(catalogue_chapter types '| Type | Family |' '| `core.note` | core |')"
types_expected="$(catalogue_expected '| Type | Family |' '| `core.note` | core |')"
edges_chapter="$(catalogue_chapter edge-types '| Edge type | On delete |' '| `parent-of` | cascade |')"
edges_expected="$(catalogue_expected '| Edge type | On delete |' '| `parent-of` | cascade |')"
permissions_chapter="$(catalogue_chapter permissions '| Permission | Lets |' '| `keys.mint` | Minting keys. |')"
permissions_expected="$(catalogue_expected '| Permission | Lets |' '| `keys.mint` | Minting keys. |')"
events_chapter="$(catalogue_chapter event-types '| Event | Sent to |' '| `item.created` | Streams |')"
events_expected="$(catalogue_expected '| Event | Sent to |' '| `item.created` | Streams |')"

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
  printf 'stale commands\n' > "${dir}/docs/src/generated/marfa-commands.md"
  printf 'stale codes\n' > "${dir}/docs/src/generated/error-codes.md"
  printf 'stale settings\n' > "${dir}/docs/src/generated/settings.md"
  printf 'stale types\n' > "${dir}/docs/src/generated/core-types.md"
  printf 'stale edge types\n' > "${dir}/docs/src/generated/edge-types.md"
  printf 'stale permissions\n' > "${dir}/docs/src/generated/permissions.md"
  printf 'stale events\n' > "${dir}/docs/src/generated/event-types.md"
  printf '{"version":"v0.0.0"}\n' > "${dir}/docs/src/generated/marfa-release.json"

  cp "$2" "${dir}/marfa/openapi.json"
  printf 'new glossary\n' > "${dir}/marfa/GLOSSARY.md"
  mkdir -p "${dir}/marfa/core/marfa-cli"
  printf '%s\n' "${commands}" > "${dir}/marfa/core/marfa-cli/COMMANDS.md"
  mkdir -p "${dir}/marfa/conformance/spec"
  printf '%s\n' "${errors}" > "${dir}/marfa/conformance/spec/errors.md"
  printf '%s\n' "${instance}" > "${dir}/marfa/conformance/spec/instance.md"
  printf '%s\n' "${types_chapter}" > "${dir}/marfa/conformance/spec/types.md"
  printf '%s\n' "${edges_chapter}" > "${dir}/marfa/conformance/spec/edges.md"
  printf '%s\n' "${permissions_chapter}" > "${dir}/marfa/conformance/spec/keys-and-oauth.md"
  printf '%s\n' "${events_chapter}" > "${dir}/marfa/conformance/spec/events.md"
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
  out="$(MARFA_ROOT="${work}/$1/marfa" bash "${work}/$1/docs/scripts/sync-from-marfa.sh" 2>&1)" || status=$?
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

python3 - "${description}" > "${work}/good.json" <<'PY'
import json, sys
print(json.dumps({"openapi": "3.1.0", "info": {"title": "Marfa", "version": "0", "description": sys.argv[1]}, "paths": {}}))
PY
fixture good "${work}/good.json"
sync good
echo "a good description"
check "the script succeeds" 0 "${status}"
check "it names what it synced and the release" \
  "openapi.json, the API overview, GLOSSARY.md, the command reference, the error codes, the settings, the type, edge type, permission and event type catalogues and the release (v1.2.3) synced from ${work}/good/marfa" "${out}"
check "the overview is the description with each heading one level lower" \
  "${expected}" "$(cat "${work}/good/docs/src/generated/api-overview.md")"
check "the overview ends with one newline" "" "$(tail -c 1 "${work}/good/docs/src/generated/api-overview.md" | tr -d '\n')"
check "the spec is copied byte for byte" \
  "$(cat "${work}/good.json")" "$(cat "${work}/good/docs/openapi.json")"
check "the glossary is copied" "new glossary" "$(cat "${work}/good/docs/src/generated/GLOSSARY.md")"
check "the command reference loses its comment and title, and nothing else" \
  "${commands_expected}" "$(cat "${work}/good/docs/src/generated/marfa-commands.md")"
check "the command reference ends with one newline" "" "$(tail -c 1 "${work}/good/docs/src/generated/marfa-commands.md" | tr -d '\n')"
check "the error codes are the rows between the markers, and nothing else" \
  "${errors_expected}" "$(cat "${work}/good/docs/src/generated/error-codes.md")"
check "the settings are the rows between the markers, and nothing else" \
  "${instance_expected}" "$(cat "${work}/good/docs/src/generated/settings.md")"
check "the types are the rows between the markers, and nothing else" \
  "${types_expected}" "$(cat "${work}/good/docs/src/generated/core-types.md")"
check "the edge types are the rows between the markers, and nothing else" \
  "${edges_expected}" "$(cat "${work}/good/docs/src/generated/edge-types.md")"
check "the permissions are the rows between the markers, and nothing else" \
  "${permissions_expected}" "$(cat "${work}/good/docs/src/generated/permissions.md")"
check "the event types are the rows between the markers, and nothing else" \
  "${events_expected}" "$(cat "${work}/good/docs/src/generated/event-types.md")"
check "the release is the latest version tag" '{"version":"v1.2.3"}' "$(cat "${work}/good/docs/src/generated/marfa-release.json")"
check "nothing else is left in the generated folder" \
  "GLOSSARY.md api-overview.md core-types.md edge-types.md error-codes.md event-types.md marfa-commands.md marfa-release.json permissions.md settings.md" "$(ls "${work}/good/docs/src/generated" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"

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
printf '%s\n' '{"info": {"description": "Intro."}}' > "${work}/untagged.json"
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
unreadable="@marfa@/core/marfa-cli/COMMANDS.md is not UTF-8 or holds nothing after its title. Nothing has changed."
refuse_commands "no command reference" "No core/marfa-cli/COMMANDS.md in @marfa@. Nothing has changed." absent
refuse_commands "an empty command reference" "No core/marfa-cli/COMMANDS.md in @marfa@. Nothing has changed." ''
refuse_commands "a command reference with only its comment and title" "${unreadable}" '<!-- Generated. -->\n\n# marfa command reference\n\n'
refuse_commands "a comment that never closes" "${unreadable}" '<!-- Generated.\n# marfa command reference\n## status\n'
refuse_commands "a command reference that is not UTF-8" "${unreadable}" '# marfa command reference\n\n\xff\xfe\n'

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
refuse_table_cases types.md types types Type
refuse_table_cases edges.md edge-types "edge types" "Edge type"
refuse_table_cases keys-and-oauth.md permissions permissions Permission
refuse_table_cases events.md event-types "event types" Event

echo "the workflow"
check "CI runs this test" 1 "$(grep -cF 'run: bash .github/scripts/sync-from-marfa.test.sh' "${here}/../workflows/ci.yml")"

printf '\nsync-from-marfa: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
