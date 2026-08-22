#!/usr/bin/env bash
# Exercises the publish guard's classification against a throwaway git history.
#
# It exists because the logic it covers otherwise only runs unattended once a
# day, and a comparison nobody has watched work is how the first version of this
# guard shipped a retry loop that could not retry and a diagnostic branch that
# was unreachable. Every case below corresponds to a verdict the workflow acts
# on differently.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${here}/read-live-commit.sh"

pass=0; fail=0
check() { # check <label> <expected-verdict> <actual-verdict>
  if [ "$2" = "$3" ]; then pass=$((pass+1)); printf '  ok    %s\n' "$1"
  else fail=$((fail+1)); printf '  FAIL  %s: expected %s, got %s\n' "$1" "$2" "$3"; fi
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"
git init -q -b main .
git config user.email t@test.invalid; git config user.name t
commit() { git commit -q --allow-empty -m "$1"; git rev-parse HEAD; }

c1="$(commit one)"; c2="$(commit two)"; c3="$(commit three)"
# A local ref standing in for the remote, so the test needs no network.
git update-ref refs/remotes/origin/main "$c3"
git checkout -q -b side "$c2"; side="$(commit side)"; git checkout -q main
export MAIN_REF=origin/main

check "identical is current"            current        "$(describe_live_state "$c3" "$c3")"
check "an earlier commit is behind"     behind         "$(describe_live_state "$c3" "$c1")"
check "a later commit is ahead"         ahead          "$(describe_live_state "$c1" "$c3")"
check "an unmerged branch is off-main"  off-main       "$(describe_live_state "$c3" "$side")"
check "an unknown sha is unknown"       unknown-commit "$(describe_live_state "$c3" "0000000000000000000000000000000000000000")"
check "an unresolvable expected side"   unknown-commit "$(describe_live_state "ffffffffffffffffffffffffffffffffffffffff" "$c3")"
check "a dirty build is dirty"          dirty          "$(describe_live_state "$c3" "${c1}-dirty")"
check "a missing route passes through"  missing        "$(describe_live_state "$c3" missing)"
check "unreachable passes through"      unreachable    "$(describe_live_state "$c3" unreachable)"
check "unreadable passes through"       unreadable     "$(describe_live_state "$c3" unreadable)"

# The off-main case is the one worth stating twice: a commit built directly on
# main's tip is a descendant of it and still not on main, and calling that
# "ahead" would certify hand-published content as healthy.
git checkout -q -b tip-child "$c3"; tipchild="$(commit "built on the tip")"; git checkout -q main
check "a descendant of the tip is still off-main" off-main "$(describe_live_state "$c3" "$tipchild")"

printf '\nread-live-commit: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
