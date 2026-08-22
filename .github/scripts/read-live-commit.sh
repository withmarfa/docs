#!/usr/bin/env bash
# Reading what the live docs site is serving, and deciding what that means.
#
# Two functions, sourced by the Publish workflow. They are separate from it and
# take their inputs as arguments so `read-live-commit.test.sh` can drive both
# against a real HTTP server and a real git history, rather than the logic only
# ever running unattended at 07:23.
#
# `read_live_commit` never returns an empty string and never exits non-zero.
# Under `bash -e`, `LIVE="$(curl ... | jq ...)"` takes jq's status, so a parse
# error on an HTML error page would kill the calling step outright, which is
# exactly what happens during the propagation window a retry loop exists to wait
# out. Every failure is a word instead:
#
#   <sha>        the commit the site reports, shape-checked
#   <sha>-dirty  built from a modified working tree, so it matches no commit
#   missing      404, so the route is not deployed
#   unreachable  no usable response: a transport failure, or any status that is
#                neither 2xx nor 404
#   unreadable   a 2xx whose body is not a version document naming a commit

# The URL the guard polls. Its own function so the default is reachable from a
# test without a network call. Left inline, every HTTP case overrides
# DOCS_SITE_URL and the default is never exercised by anything.
live_version_url() {
  local base
  # Deployment-specific, so it comes from the environment with the Marfa site as
  # the default. A third party running this workflow polls their own site rather
  # than being told, ten attempts later, that ours does not match their commit.
  base="${DOCS_SITE_URL:-https://docs.marfa.so}"
  # A cache-buster on the query string. The route sets `no-store`, but the one
  # endpoint whose whole job is answering "what is live right now" should not
  # depend on an edge honouring a header.
  printf '%s/version.json?cb=%s-%s' "${base%/}" "${GITHUB_RUN_ID:-$$}" "${RANDOM:-0}"
}

read_live_commit() {
  local url body code tmp commit
  url="$(live_version_url)"

  tmp="$(mktemp)"
  # No `--fail`: it discards the body and collapses every HTTP error into one
  # exit code, which put a missing route into the "site is down" bucket and sent
  # the reader after an availability problem that did not exist. The status comes
  # from `-w`, on stdout, which is captured; stderr is left alone so
  # `--show-error`'s reason reaches the job log. Redirecting stderr into the
  # capture instead throws the status away and returns the error text as if it
  # were the code.
  #
  # No `--location` either. A redirect is a real answer about the deployment
  # rather than something to follow silently: the custom domain moved, or the
  # configured URL has the wrong scheme.
  code="$(curl --silent --show-error --max-time 20 --write-out '%{http_code}' \
            --output "$tmp" "$url")" || code=''
  if ! printf '%s' "$code" | grep -Eq '^[0-9]{3}$'; then
    rm -f "$tmp"; printf 'unreachable'; return 0
  fi

  body="$(cat "$tmp")"; rm -f "$tmp"

  case "$code" in
    404) printf 'missing'; return 0 ;;
    2*)  ;;
    # 3xx, 401, 403, 5xx and anything else. curl's own message already carries
    # the status to the job log, so this does not need an arm per code.
    *)   printf 'unreachable'; return 0 ;;
  esac

  commit="$(printf '%s' "$body" | jq -r 'if (.commit | type) == "string" then .commit else empty end' 2>/dev/null)" || commit=''
  # Shape-checked before it leaves. An unchecked value reaches an `echo
  # "::error ...::${LIVE}"`, where a second line is parsed by the runner as a
  # workflow command, and turns every verdict into multi-line job output.
  #
  # The line count is checked first and separately, because `grep -E '^...$'`
  # anchors per line rather than per string: a value whose first line happens to
  # look like a sha passes it, carrying whatever follows. The test covers
  # exactly that case.
  if [ "$(printf '%s' "$commit" | wc -l | tr -d ' ')" != "0" ] \
     || ! printf '%s' "$commit" | grep -Eq '^[0-9a-f]{7,40}(-dirty)?$'; then
    printf 'unreadable'; return 0
  fi
  printf '%s' "$commit"
}

# describe_live_state <expected-sha> <live-value>
#
# Answers with one word. The caller owns the wording and the exit code; keeping
# the decision here is what makes it testable.
#
#   current        serving exactly what was expected
#   ahead          serving a later commit that is still on the comparison branch,
#                  which happens by construction when a merge lands mid-run
#   behind         serving an earlier commit on that branch
#   off-main       serving a real commit that is not on that branch, so it was
#                  published from somewhere else
#   unknown-commit serving a commit this repository has never heard of
#   unknown-ref    the comparison branch itself does not resolve, so no verdict
#                  is available and the checkout is the thing at fault
#   dirty          built from a modified tree, so it matches no commit
#   missing / unreachable / unreadable  passed straight through
#
# Requires a full checkout: on a shallow one, nothing but the tip resolves.
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
  # And the comparison ref, for the same reason. `--is-ancestor` exits 1 for
  # false and 128 for a ref that does not resolve, and `if !` cannot tell them
  # apart, so a checkout missing `origin/main` would have reported every live
  # commit as published from somewhere else.
  git cat-file -e "${main_ref}^{commit}" 2>/dev/null || { printf 'unknown-ref'; return 0; }

  # Being a descendant of the expected commit is not the same as being on the
  # comparison branch. An unmerged branch built on its tip is a descendant, and
  # reporting that as a benign "ahead" would certify hand-published, unreviewed
  # content as healthy every morning thereafter.
  if ! git merge-base --is-ancestor "$live" "$main_ref" 2>/dev/null; then
    printf 'off-main'; return 0
  fi

  if git merge-base --is-ancestor "$expected" "$live" 2>/dev/null; then
    printf 'ahead'; return 0
  fi
  printf 'behind'
}
