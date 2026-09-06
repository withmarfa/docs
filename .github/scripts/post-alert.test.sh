#!/usr/bin/env bash
# What the notifier decides to say, and under which key.
#
# The title and state selection is the whole judgment in the notifier: which
# failure is a statement about the site, which is a statement about the
# checkout, and which is no statement at all. It used to live in a `run:` block
# where nothing could reach it. Two Workers now publish from this repository,
# so it also has to keep two alert streams apart — a resolve posted under the
# wrong key silently clears a real open alert about the other site.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${here}/post-alert.sh"

pass=0; fail=0
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then pass=$((pass+1)); printf '  ok    %s\n' "$1"
  else fail=$((fail+1)); printf '  FAIL  %s: expected %s, got %s\n' "$1" "$2" "$3"; fi
}

SUBJECT="Docs site"
CHECK_SUBJECT="Docs publish check"

# decide <results> <live> <expected> <verdict> [store] -> "state|title"
#
# `store` is reset on every call rather than defaulted, because these are plain
# assignments and a value left set would leak into every case after it.
decide() {
  RESULTS="$1" LIVE="$2" EXPECTED="$3" VERDICT="$4" STORE="${5:-}"
  local out; out="$(alert_title_and_state)"
  printf '%s|%s' "${out%%$'\t'*}" "${out#*$'\t'}"
}

SHA_A=1111111111111111111111111111111111111111
SHA_B=2222222222222222222222222222222222222222

echo "alert_title_and_state"

check "a clean run resolves" \
  "resolved|Docs site: current" "$(decide 'success,skipped' '' '' '')"

check "a stale site names both commits" \
  "open|Docs site: serving 1111111, main is 2222222" \
  "$(decide 'failure,skipped' "$SHA_A" "$SHA_B" behind)"

# A statement about the checkout, not about the site. Naming a verdict here
# would be the confidently-wrong diagnostic the guard itself refuses to make.
check "a broken checkout changes subject to the check" \
  "open|Docs publish check: inconclusive" \
  "$(decide 'failure,skipped' "$SHA_A" origin/main unknown-ref)"

check "an unreachable site reports the verdict" \
  "open|Docs site: unreachable" "$(decide 'failure,skipped' unreachable "$SHA_B" unreachable)"

check "a missing route reports the verdict" \
  "open|Docs site: missing" "$(decide 'failure,skipped' missing "$SHA_B" missing)"

check "failing before reading the site names the commit that should be live" \
  "open|Docs site: not publishing 2222222" "$(decide 'failure,skipped' '' "$SHA_B" '')"

check "failing with nothing at all is inconclusive" \
  "open|Docs publish check: inconclusive" "$(decide 'failure,skipped' '' '' '')"

# The status target reports a second, independent fact: whether the checker is
# still writing. It outranks the publish verdict, because a page serving the
# right bundle full of frozen data is worse than one serving an old bundle —
# everything on it still reads as reassuring and none of it is true.
check "a stale store outranks a matching pair of commits" \
  "open|Docs site: store stale" \
  "$(decide 'failure,skipped' "$SHA_A" "$SHA_A" current stale)"

check "an empty store is named as such" \
  "open|Docs site: store empty" \
  "$(decide 'failure,skipped' "$SHA_A" "$SHA_A" current empty)"

check "a stale store still outranks a broken checkout" \
  "open|Docs site: store unreachable" \
  "$(decide 'failure,skipped' "$SHA_A" origin/main unknown-ref unreachable)"

# The docs notifier never sets it, and a fresh store must not change any
# existing wording.
check "a fresh store says nothing on its own" \
  "open|Docs site: serving 1111111, main is 2222222" \
  "$(decide 'failure,skipped' "$SHA_A" "$SHA_B" behind fresh)"

check "an unset store leaves the docs notifier untouched" \
  "open|Docs site: serving 1111111, main is 2222222" \
  "$(decide 'failure,skipped' "$SHA_A" "$SHA_B" behind)"

# Hosted runners, so a cancel is GitHub dropping a queued run when several
# merges land together, not a signal about the site.
check "a cancelled run says nothing" \
  "cancelled|" "$(decide 'cancelled,skipped' '' '' '')"

check "no job reaching a verdict is inconclusive, not skipped" \
  "open|Docs publish check: inconclusive" "$(decide 'skipped,skipped' '' '' '')"

# The subject is what keeps the two sites' alerts readable apart.
SUBJECT="Status page"; CHECK_SUBJECT="Status publish check"
check "the second target speaks for itself" \
  "open|Status page: serving 1111111, main is 2222222" \
  "$(decide 'failure,skipped' "$SHA_A" "$SHA_B" behind)"
check "and when it is fine" \
  "resolved|Status page: current" "$(decide 'success,skipped' '' '' '')"

# ------------------------------------------------------------------ the keys
#
# The key pairs an open alert with the resolve that clears it. One key across
# two publish paths means a green docs publish posts `resolved` against the
# same key an open status-publish failure is holding, silently clearing it.
echo
echo "alert keys"

workflow="${here}/../workflows/publish.yml"
if [ ! -f "$workflow" ]; then
  echo "  (workflow not found, skipping)"
else
  body="$(sed 's/#.*//' "$workflow")"
  keys="$(printf '%s\n' "$body" | grep -o 'ALERT_KEY:[^\n]*' | sed 's/ALERT_KEY: *//' | sort -u)"
  count="$(printf '%s\n' "$keys" | grep -c . || true)"
  check "each publish path carries its own alert key" 2 "$count"

  for fn in post-alert.sh; do
    if [[ $body == *"$fn"* ]]; then
      pass=$((pass+1)); printf '  ok    the workflow calls %s\n' "$fn"
    else
      fail=$((fail+1)); printf '  FAIL  the workflow no longer calls %s outside a comment\n' "$fn"
    fi
  done
fi

printf '\npost-alert: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
