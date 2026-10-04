#!/usr/bin/env bash
# Whether a change can affect `Build and type-check`.
#
#   .github/scripts/ci-changes.sh     # in CI: writes code=true|false to GITHUB_OUTPUT
#   .github/scripts/ci-changes.sh -   # prints the answer for NUL-separated paths on stdin
#
# The job is a required check, so the workflow carries no `paths` filter: a
# filtered-out workflow leaves the check pending and blocks the merge, while a
# job skipped by `if:` reports as skipped and satisfies it.
#
# Every uncertain case answers true. That covers a manual or scheduled run, an
# empty diff, a diff that cannot be read, a path no rule names, and a push whose
# parent commit has no green run of this workflow. The last one matters because
# a push run that skips the build reports success: classifying a push against
# a red parent would let a documentation commit make `main` look green.
#
# `content/` is built into the site, so Markdown and MDX there are never
# skipped. Only the named root files and the agent directories are.
# `.github/scripts/ci-changes.test.sh` pins the rules.
set -euo pipefail

CI_WORKFLOW="ci.yml"

# Whether one changed path can affect the job. A path no rule names can.
affects() {
  case "$1" in
    # Agent instructions and repository metadata that nothing builds or reads.
    # Root files are named one by one: a `*.md` rule would also match
    # `content/**`, which the build reads.
    AGENTS.md | CLAUDE.md | README.md | LICENSE) return 1 ;;
    .agents/* | .claude/* | .codex/* | .githooks/*) return 1 ;;
    .github/ISSUE_TEMPLATE/* | .github/PULL_REQUEST_TEMPLATE.md) return 1 ;;
    *) return 0 ;;
  esac
}

# Reads NUL-separated paths and prints true when any can affect the job.
answer() {
  local path seen=false
  while IFS= read -r -d '' path; do
    seen=true
    if affects "${path}"; then
      echo true
      return
    fi
  done
  # An empty diff cannot be told apart from one that was not read.
  if [[ "${seen}" == true ]]; then echo false; else echo true; fi
}

# Whether this workflow finished green on the commit a push replaced.
previous_green() {
  local count
  count="$(gh api "repos/${GITHUB_REPOSITORY:?}/actions/workflows/${CI_WORKFLOW}/runs?head_sha=${BASE}&branch=main&event=push&status=success&per_page=1" \
    --jq .total_count 2>/dev/null)" || return 1
  [[ "${count}" =~ ^[0-9]+$ ]] && ((count > 0))
}

if [[ "${1:-}" == - ]]; then
  answer
  exit
fi

code=true
event="${GITHUB_EVENT_NAME:-}"
if [[ "${event}" == pull_request || "${event}" == push ]]; then
  list="$(mktemp)"
  trap 'rm -f "${list}"' EXIT
  range=("${BASE:-}...${HEAD:-}")
  # A push compares the two trees: the old tip need not be an ancestor.
  if [[ "${event}" == push ]]; then range=("${BASE:-}" "${HEAD:-}"); fi
  if [[ "${BASE:-}" =~ ^[0-9a-f]{40}$ && "${HEAD:-}" =~ ^[0-9a-f]{40}$ && ! "${BASE}" =~ ^0+$ ]] &&
    git diff --name-only --no-renames -z "${range[@]}" -- >"${list}"; then
    code="$(answer <"${list}")"
    if [[ "${event}" == push && "${code}" == false ]] && ! previous_green; then
      echo "The previous commit on main has no green run of ${CI_WORKFLOW}; running the job."
      code=true
    fi
  else
    echo "Could not classify the change; running the job."
  fi
else
  echo "Event '${event}' is not classified; running the job."
fi
echo "code=${code}"
echo "code=${code}" >>"${GITHUB_OUTPUT:-/dev/null}"
