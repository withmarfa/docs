#!/usr/bin/env bash
# Runs scripts/sync-from-marfa.sh against throwaway checkouts of the docs and of
# the monorepo, and pins what it writes and when it refuses.
#
# The parts that need a test are the files the script rewrites rather than
# copies. It turns the spec's info.description into
# src/generated/api-overview.md, moving each heading down a level, and splits the
# command reference into src/generated/cli/, one file per section of the
# reference without its heading (global-options.md, exit-codes.md and a file for
# each command, which loses its own `### marfa <command>` heading when that is
# its first section), and it takes the code table from the errors
# chapter into src/generated/error-codes.md and the settings table from the
# instance chapter into src/generated/settings.md, the tables of the shipped
# types, edge types, permissions and event types from their chapters into
# src/generated/core-types.md, edge-types.md, permissions.md and event-types.md,
# and it hashes every rule of the contract's chapters into
# src/generated/contract-index.json. A description that is missing, blank or the
# wrong type, a spec whose top level or `info` is not an object, or a command
# reference that is missing, empty, not UTF-8, without its global options or exit
# codes or any command, with a command name that is not a plain lowercase name,
# a section that repeats or holds nothing, or a chapter with no table between its
# markers, or a contract with no rules, a repeated rule ID or an ID under another
# chapter, must stop the script before it changes anything, with one line saying
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
# The script's own temporary files and folders go here, so that one left behind
# can be seen at the end.
mkdir "${work}/tmp"

# The command reference every fixture holds: the generated-file comment, the
# title, the intro, the global options, the exit codes with a fenced block whose
# lines look like headings, a command with one section named for it (status), a
# command with a section named for it and two commands under it (owner) and a
# command with one section that is not named for it (search). The files the
# script writes from it follow.
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
cli_status_expected="$(cat <<'EOF'
What the instance says about itself.

```text
# not a heading either
marfa status [OPTIONS]
```
EOF
)"
cli_owner_expected="$(cat <<'EOF'
The owner, the one account behind the sign-in surface.

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
EOF
)"
cli_search_expected="$(cat <<'EOF'
Search the instance.

### marfa search items

```text
marfa search items [OPTIONS] <QUERY>
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
# takes from each.
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
  printf 'stale types\n' > "${dir}/docs/src/generated/core-types.md"
  printf 'stale edge types\n' > "${dir}/docs/src/generated/edge-types.md"
  printf 'stale permissions\n' > "${dir}/docs/src/generated/permissions.md"
  printf 'stale events\n' > "${dir}/docs/src/generated/event-types.md"
  printf 'stale index\n' > "${dir}/docs/src/generated/contract-index.json"
  printf '{"version":"v0.0.0"}\n' > "${dir}/docs/src/generated/marfa-release.json"

  cp "$2" "${dir}/marfa/openapi.json"
  printf '%s\n' "${glossary}" > "${dir}/marfa/GLOSSARY.md"
  mkdir -p "${dir}/marfa/core/marfa-cli"
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

python3 - "${description}" > "${work}/good.json" <<'PY'
import json, sys
print(json.dumps({"openapi": "3.1.0", "info": {"title": "Marfa", "version": "0", "description": sys.argv[1]}, "paths": {}}))
PY
fixture good "${work}/good.json"
sync good
echo "a good description"
check "the script succeeds" 0 "${status}"
check "it names what it synced and the release" \
  "openapi.json, the API overview, GLOSSARY.md, the command reference in src/generated/cli, the error codes, the settings, the type, edge type, permission and event type catalogues, the contract index, the release (v1.2.3) and its CLI download synced from ${work}/good/marfa" "${out}"
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
check "a command with one section named for it loses that heading and keeps its usage" \
  "${cli_status_expected}" "$(cat "${cli}/status.md")"
check "a command with a section named for it and two commands loses that heading, keeps its usage and both commands" \
  "${cli_owner_expected}" "$(cat "${cli}/owner.md")"
check "a command with one section not named for it keeps that heading" \
  "${cli_search_expected}" "$(cat "${cli}/search.md")"
for file in "${cli}"/*.md; do
  check "$(basename "${file}") starts with text and ends with exactly one newline" True \
    "$(python3 -c 'import sys; t = open(sys.argv[1]).read(); print(t.endswith("\n") and not t.endswith("\n\n") and not t[0].isspace())' "${file}")"
done
check "the old command file is gone and the others are the reference's sections" \
  "exit-codes.md global-options.md owner.md search.md status.md" "$(ls "${cli}" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"
check "the folder can be read by anyone who can read the checkout" \
  755 "$(python3 -c 'import os, sys; print(oct(os.stat(sys.argv[1]).st_mode & 0o777)[2:])' "${cli}")"
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
check "the contract index groups each rule's hash under its chapter, in file order" \
  "${index_expected}" "$(cat "${work}/good/docs/src/generated/contract-index.json")"
check "the release is the latest version tag" '{"version":"v1.2.3"}' "$(cat "${work}/good/docs/src/generated/marfa-release.json")"
check "the CLI download names that release and its archive" \
  'curl -fsSL https://github.com/withmarfa/marfa/releases/download/v1.2.3/marfa-1.2.3-darwin-arm64.tar.gz | tar -xz' \
  "$(sed -n 2p "${work}/good/docs/src/generated/cli-download.md")"
check "the CLI download is one bash block" '```bash|```' "$(head -1 "${work}/good/docs/src/generated/cli-download.md")|$(tail -1 "${work}/good/docs/src/generated/cli-download.md")"
check "nothing else is left in the generated folder" \
  "GLOSSARY.md api-overview.md cli cli-download.md contract-index.json core-types.md edge-types.md error-codes.md event-types.md marfa-release.json permissions.md settings.md" "$(ls "${work}/good/docs/src/generated" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"

# The split must not depend on the folder being there already, or on how the
# reference's lines end.
echo "a command reference in other conditions"
fixture first "${work}/good.json"
rm -r "${work}/first/docs/src/generated/cli"
sync first
check "no cli folder yet: the script succeeds" 0 "${status}"
check "no cli folder yet: the folder is written" \
  "exit-codes.md global-options.md owner.md search.md status.md" "$(ls "${work}/first/docs/src/generated/cli" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"

fixture crlf "${work}/good.json"
awk '{ printf "%s\r\n", $0 }' "${work}/crlf/marfa/core/marfa-cli/COMMANDS.md" > "${work}/crlf.md"
cp "${work}/crlf.md" "${work}/crlf/marfa/core/marfa-cli/COMMANDS.md"
sync crlf
check "Windows line endings: the script succeeds" 0 "${status}"
check "Windows line endings: the files are the same" \
  "$(cat "${cli}/exit-codes.md" "${cli}/owner.md" "${cli}/status.md")" \
  "$(cat "${work}/crlf/docs/src/generated/cli/exit-codes.md" "${work}/crlf/docs/src/generated/cli/owner.md" "${work}/crlf/docs/src/generated/cli/status.md")"

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
refuse_commands "no command" \
  "${cli_file} has no section for any command (a '## <command>' heading). Nothing has changed." "${cli_head}${cli_global}${cli_exit}"
refuse_commands "a command name with a capital" \
  "${cli_file} has the section '## Status', which is not a command name (lowercase letters, digits and hyphens). Nothing has changed." \
  "${cli_head}${cli_global}${cli_exit}## Status\n\nAbout.\n"
refuse_commands "a command name with an underscore" \
  "${cli_file} has the section '## sign_ins', which is not a command name (lowercase letters, digits and hyphens). Nothing has changed." \
  "${cli_head}${cli_global}${cli_exit}${cli_status}## sign_ins\n\nAbout.\n"
refuse_commands "a command name that starts with a digit" \
  "${cli_file} has the section '## 2fa', which is not a command name (lowercase letters, digits and hyphens). Nothing has changed." \
  "${cli_head}${cli_global}${cli_exit}${cli_status}## 2fa\n\nAbout.\n"
refuse_commands "a command name of two words" \
  "${cli_file} has the section '## sign ins', which is not a command name (lowercase letters, digits and hyphens). Nothing has changed." \
  "${cli_head}${cli_global}${cli_exit}${cli_status}## sign ins\n\nAbout.\n"
refuse_commands "a command that repeats" \
  "${cli_file} repeats the section '## status'. Nothing has changed." "${cli_head}${cli_global}${cli_exit}${cli_status}${cli_status}"
refuse_commands "global options that repeat" \
  "${cli_file} repeats the section '## Global options'. Nothing has changed." "${cli_head}${cli_global}${cli_exit}${cli_global}${cli_status}"
refuse_commands "a command named for a file of the split" \
  "${cli_file} repeats the section '## exit-codes'. Nothing has changed." "${cli_head}${cli_global}${cli_exit}## exit-codes\n\nAbout.\n"
refuse_commands "a command with nothing under it" \
  "${cli_file} has nothing under '## status'. Nothing has changed." "${cli_head}${cli_global}${cli_exit}## status\n\n## owner\n\nAbout.\n"
refuse_commands "a command with only its own heading under it" \
  "${cli_file} has nothing under '## status'. Nothing has changed." "${cli_head}${cli_global}${cli_exit}## status\n\n### marfa status\n\n"
refuse_commands "global options with nothing under them" \
  "${cli_file} has nothing under '## Global options'. Nothing has changed." "${cli_head}## Global options\n\n${cli_exit}${cli_status}"

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

echo "temporary files"
check "no temporary file or folder is left behind, by a success or a refusal" "" "$(ls -A "${work}/tmp")"

echo "the workflow"
check "CI runs this test" 1 "$(grep -cF 'run: bash .github/scripts/sync-from-marfa.test.sh' "${here}/../workflows/ci.yml")"

printf '\nsync-from-marfa: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
