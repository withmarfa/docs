#!/usr/bin/env bash
# Reads the commit the live docs site is serving, from https://docs.marfa.so/version.json.
#
# Sourced by the Publish workflow rather than inlined, because both the deploy
# proof and the daily staleness check need exactly this and getting it subtly
# wrong in one of them is how the first version of that workflow shipped with a
# retry loop that could not retry.
#
# Every failure returns a word rather than an empty string or a non-zero exit.
# Under `bash -e`, `LIVE="$(curl ... | jq ...)"` takes jq's status, so a jq parse
# error on an HTML error page kills the calling step outright — which is exactly
# what happens during the propagation window the retry loop exists to wait out.
# The caller decides what each answer means; this only ever answers.
#
#   <sha>        the commit the site reports
#   <sha>-dirty  built from a modified working tree, so it matches no commit
#   unreachable  the request failed or the site returned an HTTP error
#   unreadable   something answered, but it was not the version document

read_live_commit() {
  local url body commit
  # A cache-buster on the query string. The route sets `no-store`, but relying
  # on a header the edge is free to ignore, in the one place whose whole job is
  # answering "what is live right now", is a needless dependency.
  url="https://docs.marfa.so/version.json?cb=${GITHUB_RUN_ID:-$$}-${RANDOM:-0}"

  # `|| body=''` keeps errexit out of it so the caller gets a word back rather
  # than losing the step.
  body="$(curl --silent --show-error --fail --max-time 20 "$url" 2>/dev/null)" || body=''
  if [ -z "$body" ]; then
    printf 'unreachable'
    return 0
  fi

  commit="$(printf '%s' "$body" | jq -r '.commit // empty' 2>/dev/null)" || commit=''
  if [ -z "$commit" ]; then
    printf 'unreadable'
    return 0
  fi

  printf '%s' "$commit"
}
