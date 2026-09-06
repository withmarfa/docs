#!/usr/bin/env bash
# Turning a publish run's outcome into one alert, and posting it.
#
# Extracted from the workflow when a second Worker started shipping from this
# repository. Two publish paths need two alerts under two keys, and the choice
# was one copy of ninety lines of shell per target or one script both call. A
# copy would have drifted the first time either was fixed.
#
# Everything comes from the environment, so the caller is a `run:` line rather
# than a block, and the decisions here can be exercised by `post-alert.test.sh`.
#
#   SUBJECT        what the alert is about, e.g. "Docs site"
#   CHECK_SUBJECT  what to call it when there is no verdict, e.g. "Docs publish check"
#   ALERT_KEY      pairs an open alert with the resolve that later clears it
#   SITE_LABEL     link text for the site field
#   ALERT_URL      destination; unset means send nothing at all
#   ALERT_TOKEN    optional bearer credential
#   RESULTS        comma-joined job results
#   LIVE EXPECTED VERDICT SITE_URL
#   REPO REPO_URL WORKFLOW RUN_URL RUN_NUMBER
set -euo pipefail

# The title carries the commits themselves. Seven characters is what a reader
# compares against a git log; the fields carry them in full.
short() { printf '%s' "${1:0:7}"; }

# `needs.*.result` only ever holds success, failure, cancelled or skipped; a job
# hitting `timeout-minutes` reports failure, so there is no `timed_out` arm.
#
# Cancellation exits without reporting, matching the conformance suite rather
# than the drift guard. The drift guard treats a cancel as an alert because it
# runs on the self-hosted pool and a run that never gets picked up is how a dead
# pool presents. These jobs are hosted, so a cancel here is GitHub dropping a
# queued run when several merges land together, and alerting on it would open
# "did not complete" on an ordinary busy morning.
alert_title_and_state() { # -> "<state>\t<title>"
  local state title
  case ",${RESULTS}," in
    *,failure,*)
      state=open
      if [ "${VERDICT}" = unknown-ref ]; then
        # A statement about the checkout rather than about the site, so it
        # changes subject to the check in the same way the did-not-run case
        # does. Naming a verdict here would be the confidently-wrong diagnostic
        # the guard itself refuses to make.
        title="${CHECK_SUBJECT}: inconclusive"
      elif printf '%s' "${LIVE}" | grep -Eq '^[0-9a-f]{7,40}$' &&
           printf '%s' "${EXPECTED}" | grep -Eq '^[0-9a-f]{7,40}$'; then
        title="${SUBJECT}: serving $(short "${LIVE}"), main is $(short "${EXPECTED}")"
      elif [ -n "${VERDICT}" ]; then
        # The site answered with something that is not a commit: unreachable,
        # unreadable, missing, or built from a dirty tree.
        title="${SUBJECT}: ${VERDICT}"
      elif [ -n "${EXPECTED}" ]; then
        # It failed before it ever got to read the site.
        title="${SUBJECT}: not publishing $(short "${EXPECTED}")"
      else
        title="${CHECK_SUBJECT}: inconclusive"
      fi ;;
    *,cancelled,*) printf 'cancelled\t'; return 0 ;;
    *,success,*)   state=resolved; title="${SUBJECT}: current" ;;
    # Neither job reached a verdict. `inconclusive` rather than `skipped`, which
    # implies a decision and would make a guard that silently stopped running
    # read as routine.
    *)             state=open;     title="${CHECK_SUBJECT}: inconclusive" ;;
  esac
  printf '%s\t%s' "$state" "$title"
}

main() {
  local decided state title body auth=()

  decided="$(alert_title_and_state)"
  state="${decided%%$'\t'*}"
  title="${decided#*$'\t'}"

  if [ "$state" = cancelled ]; then
    echo "Run cancelled; nothing to report."
    return 0
  fi

  # The destination may or may not need a credential, so the header is built
  # rather than hardcoded: an empty token would otherwise be sent as "Bearer "
  # with nothing after it, which reads as a malformed request rather than an
  # unauthenticated one.
  if [ -n "${ALERT_TOKEN:-}" ]; then
    auth=(-H "Authorization: Bearer ${ALERT_TOKEN}")
  fi

  # Built into a variable and checked before anything is posted, rather than
  # piped straight into curl. A pipeline exits with the status of its last
  # command, so a jq that writes nothing leaves curl posting an empty body to a
  # destination that accepts it, and the step goes green having sent no alert.
  # `set -o pipefail` is the usual answer and it is not enough here: it makes
  # the pipeline red but cannot tell a body that failed to build from a POST
  # that failed to land, and those two want opposite handling.
  #
  # Links live in field values as Markdown and never in the title, so a
  # destination rendering the title as plain text shows prose rather than
  # bracket syntax.
  body="$(
    jq -n --arg t "$title" --arg s "$state" --arg k "${ALERT_KEY}" \
          --arg u "${RUN_URL}" --arg r "${REPO}" --arg w "${WORKFLOW}" --arg j "${RESULTS}" \
          --arg ru "${REPO_URL}" --arg rn "${RUN_NUMBER}" --arg site "${SITE_URL}" \
          --arg sl "${SITE_LABEL}" \
          --arg live "${LIVE}" --arg main "${EXPECTED}" --arg verdict "${VERDICT}" \
      '{source:"github",severity:"warning",title:$t,state:$s,key:$k,link:$u,
        fields:(
          {Repository:"[\($r)](\($ru))",Workflow:$w,Run:"[#\($rn)](\($u))",Jobs:$j}
          + (if $site == "" then {} else {Site:"[\($sl)](\($site))"} end)
          + (if $live == "" then {} else {Live:$live} end)
          + (if $main == "" then {} else {Main:$main} end)
          + (if $verdict == "" then {} else {Verdict:$verdict} end))}'
  )" || {
    echo "::error::The alert body could not be built. Nothing was sent."
    return 1
  }
  if [ -z "$body" ]; then
    echo "::error::The alert body came out empty. Nothing was sent."
    return 1
  fi

  # No `|| true`. The estate's other notifiers swallow a failed POST, which is
  # defensible where the workflow is a required context and its red run is the
  # signal. This one gates nothing, so a swallowed POST would leave no signal
  # anywhere, which is the original defect reproduced inside the thing built to
  # prevent it.
  printf '%s' "$body" \
  | curl -sS --fail-with-body --max-time 20 -X POST "${ALERT_URL}" \
      "${auth[@]}" \
      -H "Content-Type: application/json" --data @-
}

# Sourced by its test, run by the workflow.
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi
