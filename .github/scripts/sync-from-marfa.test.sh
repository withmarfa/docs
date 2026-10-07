#!/usr/bin/env bash
# Runs scripts/sync-from-marfa.sh against throwaway checkouts of the docs and of
# the monorepo, and pins what it writes and when it refuses.
#
# The part that needs a test is the API overview: the script turns the spec's
# info.description into src/generated/api-overview.md, moving each heading down
# a level. A description that is missing, blank or the wrong type, or a spec
# whose top level or `info` is not an object, must stop the script before it
# changes anything, with one line saying so, never a Python traceback. The
# script is copied into each fixture so that its docs root is the fixture, and
# the real tree is never touched.
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

# fixture <name> <spec file>
#
# Builds <name>/docs, holding the script and a stale copy of everything it
# writes, and <name>/marfa, a git checkout of a monorepo at release v1.2.3 that
# holds the spec. The stale copies are what a refusal must leave as they were.
fixture() {
  local dir="${work}/$1"
  mkdir -p "${dir}/docs/scripts" "${dir}/docs/src/generated" "${dir}/marfa"
  cp "${script}" "${dir}/docs/scripts/sync-from-marfa.sh"
  printf '{"stale":"spec"}\n' > "${dir}/docs/openapi.json"
  printf 'stale glossary\n' > "${dir}/docs/src/generated/GLOSSARY.md"
  printf 'stale overview\n' > "${dir}/docs/src/generated/api-overview.md"
  printf '{"version":"v0.0.0"}\n' > "${dir}/docs/src/generated/marfa-release.json"

  cp "$2" "${dir}/marfa/openapi.json"
  printf 'new glossary\n' > "${dir}/marfa/GLOSSARY.md"
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
  "openapi.json, the API overview, GLOSSARY.md and the release (v1.2.3) synced from ${work}/good/marfa" "${out}"
check "the overview is the description with each heading one level lower" \
  "${expected}" "$(cat "${work}/good/docs/src/generated/api-overview.md")"
check "the overview ends with one newline" "" "$(tail -c 1 "${work}/good/docs/src/generated/api-overview.md" | tr -d '\n')"
check "the spec is copied byte for byte" \
  "$(cat "${work}/good.json")" "$(cat "${work}/good/docs/openapi.json")"
check "the glossary is copied" "new glossary" "$(cat "${work}/good/docs/src/generated/GLOSSARY.md")"
check "the release is the latest version tag" '{"version":"v1.2.3"}' "$(cat "${work}/good/docs/src/generated/marfa-release.json")"
check "nothing else is left in the generated folder" \
  "GLOSSARY.md api-overview.md marfa-release.json" "$(ls "${work}/good/docs/src/generated" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"

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

echo "the workflow"
check "CI runs this test" 1 "$(grep -cF 'run: bash .github/scripts/sync-from-marfa.test.sh' "${here}/../workflows/ci.yml")"

printf '\nsync-from-marfa: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
