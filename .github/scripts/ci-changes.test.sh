#!/usr/bin/env bash
# Pins .github/scripts/ci-changes.sh: which changes run `Build and type-check`,
# that the job reads the answer, and that only a readable diff, on a pull request
# or on a push after a green run, can skip it.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "${here}/../.." && pwd)"
classifier="${here}/ci-changes.sh"
failed=0

check() { # check <label> <actual> <expected>
  if [[ "$2" == "$3" ]]; then
    echo "ok: $1"
  else
    echo "FAIL: $1: expected $3, got $2"
    failed=1
  fi
}

# runs <description> <expected> <path>...
runs() {
  local what="$1" want="$2"
  shift 2
  if (($# == 0)); then
    check "${what}" "$(: | bash "${classifier}" -)" "${want}"
  else
    check "${what}" "$(printf '%s\0' "$@" | bash "${classifier}" -)" "${want}"
  fi
}

# What needs no CI.
runs "the agent instructions" false AGENTS.md CLAUDE.md
runs "the root readme and the licence" false README.md LICENSE
runs "skills and agent settings" false .agents/skills/x/SKILL.md .claude/settings.json .codex/config.toml .githooks/pre-push
runs "a script inside an agent directory" false .agents/skills/x/helper.py
runs "the issue and pull request templates" false .github/ISSUE_TEMPLATE/bug.yml .github/PULL_REQUEST_TEMPLATE.md

# What must run.
runs "a docs page, which is built into the site" true content/docs/guides/items.mdx
runs "Markdown under content, which is built too" true content/docs/notes.md
runs "a sidebar file" true content/docs/guides/meta.json
runs "source" true src/lib/source.ts
runs "a public asset" true public/logo.svg
runs "the API spec" true openapi.json
runs "the lockfile" true pnpm-lock.yaml
runs "a package manifest" true package.json
runs "a workflow" true .github/workflows/ci.yml
runs "a workflow the build does not read" true .github/workflows/publish.yml
runs "a script CI runs" true .github/scripts/read-live-commit.sh
runs "the classifier" true .github/scripts/ci-changes.sh
runs "Dependabot's settings" true .github/dependabot.yml
runs "a path no rule names" true tools/new.ts
runs "a readme below the root" true src/status/README.md
runs "a look-alike of an agent directory" true agents/notes.md
runs "an agent file beside a docs page" true AGENTS.md content/docs/index.mdx
runs "an empty change" true

# The gate on the job, read from the workflow.
workflow="${root}/.github/workflows/ci.yml"
gate="if: \${{ !cancelled() && (needs.changes.result != 'success' || needs.changes.outputs.code != 'false') }}"
check "Build and type-check reads the answer" "$(grep -cF "${gate}" "${workflow}")" 1
check "Build and type-check keeps its name" "$(grep -cF "name: Build and type-check" "${workflow}")" 1
check "the classifier runs in CI" "$(grep -cF "run: bash .github/scripts/ci-changes.sh" "${workflow}")" 1
check "the classifier's own test runs in CI" "$(grep -cF "run: bash .github/scripts/ci-changes.test.sh" "${workflow}")" 1
check "no trigger filters paths" "$(grep -cE '^\s+paths(-ignore)?:' "${workflow}")" 0
check "a push to main gets a group of its own" "$(grep -cF "|| github.run_id }}" "${workflow}")" 1
check "only a pull request's run is cancelled" "$(grep -cF "cancel-in-progress: \${{ github.event_name == 'pull_request' }}" "${workflow}")" 1

# As CI runs it, against a repository with real commits.
repo="$(mktemp -d)"
bin="$(mktemp -d)"
trap 'rm -rf "${repo}" "${bin}"' EXIT
git_in() { git -C "${repo}" -c user.email=fixture@example.invalid -c user.name=Fixture -c commit.gpgsign=false "$@"; }
git_in init -q
mkdir -p "${repo}/content/docs" "${repo}/.agents/skills"
echo page >"${repo}/content/docs/page.mdx"
echo skill >"${repo}/.agents/skills/skill.md"
echo rules >"${repo}/AGENTS.md"
git_in add -A
git_in commit -q -m base
base="$(git_in rev-parse HEAD)"

commit_change() { # commit_change <message>; stages everything first
  git_in add -A
  git_in commit -q -m "$1"
  git_in rev-parse HEAD
}

echo "reworded" >>"${repo}/AGENTS.md"
echo "reworded" >>"${repo}/.agents/skills/skill.md"
docs_only="$(commit_change "agent words")"

echo "reworded" >>"${repo}/content/docs/page.mdx"
content="$(commit_change "docs page")"

git_in mv content/docs/page.mdx .agents/skills/page.mdx
moved_out="$(commit_change "move a page into an agent directory")"

git_in mv .agents/skills/skill.md src-skill.md
moved_in="$(commit_change "move a skill out of an agent directory")"

# A stand-in for `gh` that answers how many green runs the parent has.
cat >"${bin}/gh" <<'GH'
#!/usr/bin/env bash
case "${FAKE_GH:-}" in
  green) echo 1 ;;
  none) echo 0 ;;
  garbage) echo "not a number" ;;
  *) echo "gh: failure" >&2; exit 1 ;;
esac
GH
chmod +x "${bin}/gh"

ci() { # ci <event> <base> <head> [gh behavior]
  local output="${repo}/output"
  : >"${output}"
  (cd "${repo}" && PATH="${bin}:${PATH}" GITHUB_REPOSITORY=withmarfa/docs GITHUB_EVENT_NAME="$1" BASE="$2" HEAD="$3" \
    FAKE_GH="${4:-fail}" GITHUB_OUTPUT="${output}" bash "${classifier}" >/dev/null)
  cat "${output}"
}

check "an instruction-only pull request skips the job" "$(ci pull_request "${base}" "${docs_only}")" code=false
check "a docs page change runs it" "$(ci pull_request "${docs_only}" "${content}")" code=true
check "a page moved into an agent directory runs it, for the deletion" "$(ci pull_request "${content}" "${moved_out}")" code=true
check "a skill moved out of an agent directory runs it, for the addition" "$(ci pull_request "${moved_out}" "${moved_in}")" code=true
check "a mixed range runs it" "$(ci pull_request "${base}" "${moved_in}")" code=true
check "an unreadable diff runs it" "$(ci pull_request invalid "${docs_only}")" code=true
check "a missing head runs it" "$(ci pull_request "${base}" "")" code=true
check "an unknown commit runs it" "$(ci pull_request 1111111111111111111111111111111111111111 "${docs_only}")" code=true
check "an identical pair runs it, as an empty diff" "$(ci pull_request "${docs_only}" "${docs_only}")" code=true
check "a manual run runs it" "$(ci workflow_dispatch "${base}" "${docs_only}")" code=true
check "a scheduled run runs it" "$(ci schedule "" "")" code=true

check "an instruction-only push after a green run skips the job" "$(ci push "${base}" "${docs_only}" green)" code=false
check "an instruction-only push after no green run runs it" "$(ci push "${base}" "${docs_only}" none)" code=true
check "an instruction-only push runs it when the lookup fails" "$(ci push "${base}" "${docs_only}" fail)" code=true
check "an instruction-only push runs it when the lookup is unreadable" "$(ci push "${base}" "${docs_only}" garbage)" code=true
check "a content push runs it even after a green run" "$(ci push "${docs_only}" "${content}" green)" code=true
check "a first push runs it" "$(ci push 0000000000000000000000000000000000000000 "${docs_only}" green)" code=true
check "a push with an unknown parent runs it" "$(ci push 1111111111111111111111111111111111111111 "${docs_only}" green)" code=true

exit "${failed}"
