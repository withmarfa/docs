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
  # depend on an edge honoring a header.
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

# resolve_main_ref
#
# main's tip, or the literal ref name when it does not resolve. Never fails.
#
# The workflow used to do this inline as `EXPECTED="$(git rev-parse origin/main)"`,
# which dies under `bash -e` on a checkout without that ref — before
# `describe_live_state` is called, so the `unknown-ref` verdict written for
# exactly that case could never fire and the reader got a raw `fatal:` and
# exit 128 instead.
resolve_main_ref() {
  local main_ref="${MAIN_REF:-origin/main}"
  git rev-parse --verify --quiet "${main_ref}^{commit}" 2>/dev/null \
    || printf '%s' "$main_ref"
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
    # What the build stamps when it runs with no git. The bundle is real and
    # its provenance is not, which is a different thing from a lost route or a
    # modified tree and reads badly as either.
    unknown) printf 'unknown-build'; return 0 ;;
  esac

  [ "$live" = "$expected" ] && { printf 'current'; return 0; }

  git cat-file -e "${live}^{commit}" 2>/dev/null || { printf 'unknown-commit'; return 0; }

  # The comparison ref is checked before the expected commit, and the order is
  # load-bearing. The workflow passes `resolve_main_ref`'s output as `expected`,
  # and that returns the literal ref name when it does not resolve. Checking
  # `expected` first therefore trips on the same broken checkout and answers
  # `unknown-commit` — "the site reports a commit this repository has never
  # heard of" — about a commit that is right there. The verdict written for a
  # broken checkout was unreachable from the only caller that matters.
  #
  # `--is-ancestor` exits 1 for false and 128 for a ref that does not resolve,
  # and `if !` cannot tell them apart, so without these a missing `origin/main`
  # would report every live commit as published from somewhere else.
  git cat-file -e "${main_ref}^{commit}" 2>/dev/null || { printf 'unknown-ref'; return 0; }
  git cat-file -e "${expected}^{commit}" 2>/dev/null || { printf 'unknown-commit'; return 0; }

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

# target_needs_publish <target> <live-value> <deploy-commit>
#
# The publish job's whole path decision, in one place so it can be tested.
#
#   0  publish
#   1  nothing this target builds from changed since it last published
#
# Every uncertain case publishes. A wasted deploy costs a minute; a skipped one
# leaves a stale site behind a green run, which is the failure this workflow
# exists to close.
#
# The ancestry check is the one that is easy to leave out, and leaving it out
# wedges the target permanently. A hand-deploy from a branch — the documented
# fallback when the credential is missing — leaves the site serving a commit
# whose tree is identical to main's after the squash merge. The diff is then
# empty, the job skips, and it keeps skipping: the site never receives a commit
# the freshness check recognizes, so it reports published-from-somewhere-else
# every day with nothing able to correct it.
target_needs_publish() {
  local target="$1" live="$2" deploy="$3"

  # Not a commit at all: unreachable, unreadable, missing, or built dirty.
  case "$live" in
    *[!0-9a-f]*|"") return 0 ;;
  esac

  # A commit this checkout has never heard of.
  git cat-file -e "${live}^{commit}" 2>/dev/null || return 0

  # A real commit that is not in the history being deployed. Whatever it is —
  # a branch build, a rollback, a rewritten main — a diff against it does not
  # answer the question being asked.
  git merge-base --is-ancestor "$live" "$deploy" 2>/dev/null || return 0

  git diff --name-only "$live" "$deploy" 2>/dev/null | paths_touch_target "$target"
}

# behind_but_unaffected <expected> <live> <target>
#
# Whether a target being behind main is a finding or a fact.
#
# Two Workers publish from this repository and each publishes only when
# something it builds from has changed, so a run that touches one leaves the
# other legitimately behind main and correctly so. Without this, the daily
# check reports that site as behind for as long as it takes somebody to change
# a file it cares about — a failure that is permanent and about nothing.
#
# Returns 0 when nothing the target builds from changed between the two.
behind_but_unaffected() {
  local expected="$1" live="$2" target="$3"
  [ -n "$target" ] || return 1
  git cat-file -e "${live}^{commit}" 2>/dev/null || return 1
  git cat-file -e "${expected}^{commit}" 2>/dev/null || return 1
  git diff --name-only "$live" "$expected" 2>/dev/null | paths_touch_target "$target" && return 1
  return 0
}

# effective_verdict <expected> <live> [target]
#
# The verdict as it should be acted on: `describe_live_state`, with `behind`
# softened to `unaffected` when the commits in between are none of this
# target's business.
effective_verdict() {
  local verdict
  verdict="$(describe_live_state "$1" "$2")"
  if [ "$verdict" = behind ] && behind_but_unaffected "$1" "$2" "${3:-}"; then
    printf 'unaffected'
    return 0
  fi
  printf '%s' "$verdict"
}

# report_live_state <expected> <live> [target]
#
# The daily check's whole decision: verdict to wording to exit code. It lives
# here rather than in the workflow because a `run:` block cannot be executed by
# a test, and the previous version of this guard proved that matters — eight
# separate mutations of the YAML, including inverting the tip check and making
# the proof compare a value against itself, all passed a green test run.
# Anything in this file can be mutated and caught.
#
# Writes annotations to stdout. Returns 0 when the site is current or benignly
# ahead, 1 otherwise.
report_live_state() {
  local expected="$1" live="$2" target="${3:-}" verdict
  verdict="$(effective_verdict "$expected" "$live" "$target")"
  echo "Live: ${live}. Expected: ${expected}. Verdict: ${verdict}."

  case "$verdict" in
    current)
      echo "Live site is serving main."
      return 0 ;;
    ahead)
      # Benign and expected: a merge landing while this run is in flight
      # publishes a commit newer than the one the run was created at.
      echo "Live site is ahead of ${expected} and still on main. A merge landed while this run was in flight."
      return 0 ;;
    unaffected)
      # Behind main, and correctly so. Nothing this target builds from has
      # changed since it published, so republishing would produce the same
      # bundle. Reporting it as behind would fail a check that nobody can
      # fix except by changing an unrelated file.
      echo "Live site is behind ${expected}, and nothing it builds from changed in between. It is serving the right bundle."
      return 0 ;;
    behind)
      echo "::error title=Published site is behind::The live site reports ${live}; main is ${expected}."
      echo "Unpublished commits:"
      git log --oneline "${live}..${expected}" 2>/dev/null || echo "  (could not list them)"
      return 1 ;;
    off-main)
      echo "::error title=The live site was published from something that is not main::It reports ${live}, which is a real commit here but is not on main. Somebody published from a branch, or main was rewritten."
      return 1 ;;
    unknown-commit)
      echo "::error title=The live commit is unknown here::The site reports ${live}, which is not in this repository's history."
      return 1 ;;
    unknown-ref)
      echo "::error title=Cannot compare, main does not resolve here::The live site reports ${live}, but this checkout has no origin/main to compare against. That is a broken checkout rather than a verdict about the site, and it is reported as such because reading it as published-from-somewhere-else is exactly the confidently-wrong diagnostic this guard exists to avoid."
      return 1 ;;
    dirty)
      echo "::error title=The live site was built from a modified tree::It reports ${live}. Somebody deployed by hand with uncommitted changes, so what is being served matches no commit."
      return 1 ;;
    unknown-build)
      echo "::error title=The live site cannot say what it was built from::It reports an unknown commit, which is what the build stamps when it runs with no git available. The bundle is real; its provenance is not recorded."
      return 1 ;;
    missing)
      echo "::error title=The version endpoint is not deployed::The site answered 404. The route was lost in a deploy, or the live bundle predates it."
      return 1 ;;
    unreachable)
      echo "::error title=No usable response from the docs site::That covers a transport failure and any status that is neither success nor 404, so a redirect, a 403 from bot management, and a genuinely dead site all land here. curl's own reason is in the log above, and it is the thing to read first."
      return 1 ;;
    unreadable)
      echo "::error title=The version endpoint answered with something else::It returned a 200 that is not the version document."
      return 1 ;;
    *)
      echo "::error title=Unrecognized verdict::describe_live_state returned '${verdict}', which this guard does not handle."
      return 1 ;;
  esac
}

# paths_touch_target <target>   (changed paths, one per line, on stdin)
#
# Whether a build target needs republishing for a set of changed files.
#
#   0  something it builds from changed, publish it
#   1  nothing it builds from changed, skip
#
# Two Workers ship from this repository and a merge usually concerns one of
# them. The trigger is a workflow-completion event, which supports no path
# filters and carries no changed-file list, so the decision is made here
# against a diff the job computes itself.
#
# Both lists name what is *irrelevant* to a target rather than what belongs to
# it, so the default for an unrecognised path is to publish. That direction is
# deliberate. The status page shares this repository's stylesheet, its shared
# constants and its lockfile, so a list of "status paths" would miss a shared
# change and leave the page silently stale — and stale is the one failure a
# status page may not have. A redundant publish costs a minute.
paths_touch_target() {
  local target="$1" path found=1

  while IFS= read -r path; do
    [ -z "$path" ] && continue

    case "$target" in
      docs)
        # Only the status target's own files cannot reach the docs bundle.
        case "$path" in
          src/status/*|vite.status.config.ts|wrangler.status.jsonc|tsconfig.status.json)
            continue ;;
        esac ;;
      status)
        # Documentation content, docs-only source and agent instructions.
        # Everything else may
        # reach it: the shared stylesheet, the shared constants, the base
        # tsconfig, the lockfile, either Vite config.
        #
        # `src/components/` is not on this list, though it looks like it should
        # be. Two of its files are imported by the status page, so excluding
        # the directory would leave the page serving a stale bundle after a
        # change to either — silently, behind a green run, which is the one
        # failure this whole comparison exists to prevent. The cost is that the
        # status page republishes for docs-only components it never renders,
        # and a wasted deploy costs a minute.
        case "$path" in
          content/*|openapi.json|*.md|LICENSE|.github/*|scripts/*|src/routes/*|.agents/*|.claude/*|.codex/*|.githooks/*)
            continue ;;
        esac ;;
      *)
        # An unrecognised target is a mistake in the workflow, not a reason to
        # publish nothing and report success.
        return 0 ;;
    esac

    found=0
  done

  return $found
}

# check_deploy_target <event-name> <ref> <deploy-commit> <tip>
#
# Whether the publish job should go ahead. Writes its reasoning to stdout.
#
#   0  deploy
#   1  refuse loudly, this should not have been attempted
#   2  do not deploy and do not fail: main has moved on, and the run that
#      carries the newer commit publishes it
check_deploy_target() {
  local event="$1" ref="$2" deploy="$3" tip="$4"

  # `resolve_main_ref` never fails: it hands back the literal ref name when the
  # ref does not resolve. Without this, that string is compared against a sha,
  # they differ, and a broken checkout takes the "main has moved on" arm —
  # publishing nothing and succeeding, so the commit is never published and
  # nothing says so. It also emitted the sentence "main has moved to
  # origin/main", which is the confidently-wrong diagnostic the
  # `unknown-ref` verdict exists to avoid, in the one place that had no
  # equivalent.
  case "$tip" in
    *[!0-9a-f]*|"")
      echo "::error title=Cannot tell whether this is main::The comparison ref did not resolve, so there is no tip to check ${deploy} against. That is a broken checkout rather than a verdict about the commit."
      return 1 ;;
  esac

  if [ "$event" = "workflow_dispatch" ] && [ "$ref" != "refs/heads/main" ] && [ "$deploy" != "$tip" ]; then
    echo "::error title=Publishing is restricted to main::Dispatched from ${ref}, at ${deploy}, while main is at ${tip}. Publishing a branch would put unmerged content on the live site, and the daily check would then report it healthy because it is a real commit."
    return 1
  fi

  if [ "$deploy" != "$tip" ]; then
    # Not an error. Two ordinary things reach here: merges landing a few
    # minutes apart, and a re-run of a superseded run. In both, the newer
    # commit is what should be live and something else publishes it, so
    # deploying this one would roll the site back. Refusing loudly would
    # fail the run, saying publishing is broken when it is working.
    echo "Not publishing ${deploy}: main has moved to ${tip}, and the run carrying that commit publishes it. Deploying this one would roll the site back."
    return 2
  fi

  echo "Publishing ${deploy}, which is main's tip."
  return 0
}
