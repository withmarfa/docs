#!/usr/bin/env bash
# Reading what the live docs site is serving, and deciding what that means.
#
# Two functions, sourced by the Publish workflow. They are separate from it, and
# `describe_live_state` takes its inputs as arguments rather than reading the
# environment, so both can be exercised by `read-live-commit.test.sh` instead of
# only running unattended at 07:23. The first version of this logic shipped two
# bugs precisely because nothing could run it on demand.
#
# `read_live_commit` never returns an empty string and never exits non-zero.
# Under `bash -e`, `LIVE="$(curl ... | jq ...)"` takes jq's status, so a parse
# error on an HTML error page would kill the calling step outright, which is
# exactly what happens during the propagation window a retry loop exists to wait
# out. Every failure is a word instead:
#
#   <sha>        the commit the site reports
#   <sha>-dirty  built from a modified working tree, so it matches no commit
#   missing      the endpoint answered 404, so the route is not deployed
#   unreachable  the request did not complete, or the server errored
#   unreadable   a 200 that was not the version document

read_live_commit() {
  local base url body code commit tmp
  # Deployment-specific, so it comes from the environment with the Marfa site as
  # the default. A third party running this workflow polls their own site rather
  # than being told, ten attempts later, that ours does not match their commit.
  base="${DOCS_SITE_URL:-https://docs.marfa.so}"
  # A cache-buster on the query string. The route sets `no-store`, but the one
  # endpoint whose whole job is answering "what is live right now" should not
  # depend on an edge honouring a header.
  url="${base%/}/version.json?cb=${GITHUB_RUN_ID:-$$}-${RANDOM:-0}"

  tmp="$(mktemp)"
  # No `--fail`: it discards the body and collapses every HTTP error into one
  # exit code, which put a missing route into the "site is down" bucket and sent
  # the reader after an availability problem that did not exist. Status comes
  # from `-w` and the failure reason goes to the log rather than /dev/null,
  # because this is the one path whose entire job is diagnosis.
  # `--write-out` goes to stdout and is captured; stderr is left alone so
  # `--show-error`'s reason reaches the job log. Redirecting stderr into the
  # capture instead throws the status code away and returns the error text as
  # if it were the code, which reads as an unreachable site for every response.
  code="$(curl --silent --show-error --max-time 20 --write-out '%{http_code}' \
            --output "$tmp" "$url")" || code=''
  if ! printf '%s' "$code" | grep -Eq '^[0-9]{3}$'; then
    rm -f "$tmp"; printf 'unreachable'; return 0
  fi

  body="$(cat "$tmp")"; rm -f "$tmp"

  case "$code" in
    404) printf 'missing'; return 0 ;;
    2*)  ;;
    *)   printf 'HTTP %s from %s\n' "$code" "$url" >&2; printf 'unreachable'; return 0 ;;
  esac

  commit="$(printf '%s' "$body" | jq -r '.commit // empty' 2>/dev/null)" || commit=''
  if [ -z "$commit" ]; then
    printf 'unreadable'; return 0
  fi
  printf '%s' "$commit"
}

# describe_live_state <expected-sha> <live-value>
#
# Answers with one word. The caller owns the wording and the exit code; keeping
# the decision here is what makes it testable.
#
#   current        the site is serving exactly what was expected
#   ahead          serving a later commit that is still on main, which happens
#                  by construction when a merge lands mid-run
#   behind         serving an earlier commit on main
#   off-main       serving something that is not on main at all, so it was
#                  published from a branch or from a rewritten history
#   unknown-commit serving a commit this repository has never heard of
#   dirty          built from a modified tree, so it matches no commit
#   missing / unreachable / unreadable  passed straight through
#
# Requires a full checkout: on a shallow one, nothing but the tip resolves and
# every real comparison would fall through to unknown-commit.
describe_live_state() {
  local expected="$1" live="$2" main_ref="${MAIN_REF:-origin/main}"

  case "$live" in
    missing|unreachable|unreadable) printf '%s' "$live"; return 0 ;;
    *-dirty) printf 'dirty'; return 0 ;;
  esac

  [ "$live" = "$expected" ] && { printf 'current'; return 0; }

  git cat-file -e "${live}^{commit}" 2>/dev/null || { printf 'unknown-commit'; return 0; }
  # The expected side is checked too. Left unchecked, a `git merge-base` failure
  # on an unresolvable value is swallowed by `if !` and read as "not an
  # ancestor", which then reports a wrong verdict confidently.
  git cat-file -e "${expected}^{commit}" 2>/dev/null || { printf 'unknown-commit'; return 0; }

  # Being a descendant of the expected commit is not the same as being on main.
  # An unmerged branch built on main's tip is a descendant, and reporting that
  # as a benign "ahead" would certify hand-published, unreviewed content as
  # healthy every morning thereafter.
  if ! git merge-base --is-ancestor "$live" "$main_ref" 2>/dev/null; then
    printf 'off-main'; return 0
  fi

  if git merge-base --is-ancestor "$expected" "$live" 2>/dev/null; then
    printf 'ahead'; return 0
  fi
  printf 'behind'
}
