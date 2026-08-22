#!/usr/bin/env bash
# Exercises the publish guard against a real HTTP server and a real git history.
#
# The first version of this file did neither. It fed the failure words in as
# string literals and never called `read_live_commit` at all, and it exported
# MAIN_REF so the default under test was dead code, with every ref in the
# fixture pointing at the same commit. Eight separate mutations of the code it
# claimed to cover passed it, including reintroducing the two bugs the helper's
# own comments say were found and fixed. A test that cannot fail is worse than
# no test, because it reports coverage.
#
# So: the HTTP cases go through a local server that returns the real statuses
# and bodies, and the git cases run against a history where `origin/main`,
# local `main` and `HEAD` are deliberately three different commits.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${here}/read-live-commit.sh"

pass=0; fail=0
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then pass=$((pass+1)); printf '  ok    %s\n' "$1"
  else fail=$((fail+1)); printf '  FAIL  %s: expected %s, got %s\n' "$1" "$2" "$(printf '%s' "$3" | head -c 120)"; fi
}

work="$(mktemp -d)"
server_pid=""
cleanup() { [ -n "$server_pid" ] && kill "$server_pid" 2>/dev/null || true; rm -rf "$work"; }
trap cleanup EXIT

# ---------------------------------------------------------------- HTTP cases
# One server, whose reply is whatever `$work/mode` currently says. The helper
# always requests the same path, so the mode file is how a single server covers
# every response shape.
cat > "$work/server.py" <<'PYEOF'
import http.server, os, sys
WORK = sys.argv[1]
BODIES = {
    "ok":         (200, "application/json", '{"commit":"1111111111111111111111111111111111111111"}'),
    "dirty":      (200, "application/json", '{"commit":"1111111111111111111111111111111111111111-dirty"}'),
    "nokey":      (200, "application/json", '{"other":"value"}'),
    "nullcommit": (200, "application/json", '{"commit":null}'),
    "html":       (200, "text/html", "<!doctype html><html><body>not json</body></html>"),
    "empty":      (200, "application/json", ""),
    "notfound":   (404, "text/html", "<!doctype html><html><body>no such route</body></html>"),
    "server_err": (500, "application/json", '{"commit":"2222222222222222222222222222222222222222"}'),
    "forbidden":  (403, "text/html", "<html>blocked</html>"),
    "injected":   (200, "application/json", '{"commit":"deadbeef\\n::error title=INJECTED::hi"}'),
    "numeric":    (200, "application/json", '{"commit":12345}'),
    "object":     (200, "application/json", '{"commit":{"a":1}}'),
    "padded":     (200, "application/json", '{"commit":"  1111111111111111111111111111111111111111  "}'),
}
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        mode = open(os.path.join(WORK, "mode")).read().strip()
        if mode == "redirect":
            self.send_response(302); self.send_header("Location", "/elsewhere"); self.end_headers(); return
        code, ctype, body = BODIES[mode]
        raw = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[2])), H).serve_forever()
PYEOF

port=8781
echo ok > "$work/mode"
python3 "$work/server.py" "$work" "$port" & server_pid=$!
for _ in $(seq 1 40); do
  curl -s -o /dev/null --max-time 1 "http://127.0.0.1:${port}/version.json" && break || sleep 0.25
done

export DOCS_SITE_URL="http://127.0.0.1:${port}"
live() { echo "$1" > "$work/mode"; read_live_commit; }

check "a valid body returns the commit" "1111111111111111111111111111111111111111" "$(live ok)"
check "a dirty stamp comes back intact"  "1111111111111111111111111111111111111111-dirty" "$(live dirty)"
check "404 is a missing route"           missing     "$(live notfound)"
check "500 is not a missing route"       unreachable "$(live server_err)"
check "403 is not a missing route"       unreachable "$(live forbidden)"
check "a redirect is not a commit"       unreachable "$(live redirect)"
check "200 HTML is unreadable"           unreadable  "$(live html)"
check "200 with no commit key"           unreadable  "$(live nokey)"
check "200 with a null commit"           unreadable  "$(live nullcommit)"
check "an empty 200 body"                unreadable  "$(live empty)"
# A commit that is not a commit must not reach the caller. These are what turn a
# clean verdict into multi-line job output, and the injected case would have the
# runner parse a second line as a workflow command.
check "a numeric commit is refused"      unreadable  "$(live numeric)"
check "an object commit is refused"      unreadable  "$(live object)"
check "a newline-bearing commit"         unreadable  "$(live injected)"
check "a padded commit is refused"       unreadable  "$(live padded)"

# An unreachable host must not be confused with a bad response.
check "a dead port is unreachable" unreachable "$(DOCS_SITE_URL='http://127.0.0.1:9' read_live_commit 2>/dev/null)"
# A transport failure must say why in the job log. Folding stderr into the
# status capture classifies identically and silently loses the reason, which is
# the one thing the daily check exists to hand a reader.
transport_err="$(DOCS_SITE_URL='http://127.0.0.1:9' read_live_commit 2>&1 >/dev/null)"
check "the failure reason reaches the log" "yes" "$([ -n "$transport_err" ] && echo yes || echo no)"
check "a trailing slash is handled" "1111111111111111111111111111111111111111" \
      "$(echo ok > "$work/mode"; DOCS_SITE_URL="http://127.0.0.1:${port}/" read_live_commit)"

kill "$server_pid" 2>/dev/null || true; server_pid=""
unset DOCS_SITE_URL

# The default target, reachable without a network call. Every case above
# overrides DOCS_SITE_URL, so without this the default is never exercised and
# could be pointed anywhere.
check "the default host" "https://docs.marfa.so/version.json" "$(live_version_url | sed 's/?cb=.*//')"
check "an override is honoured" "http://example.invalid/version.json" \
      "$(DOCS_SITE_URL=http://example.invalid live_version_url | sed 's/?cb=.*//')"
check "the cache-buster is present" "yes" "$(live_version_url | grep -q 'cb=' && echo yes || echo no)"

# ----------------------------------------------------------------- git cases
# `origin/main`, local `main` and `HEAD` are three different commits on purpose.
# With them equal, a classifier reading the wrong ref passes everything.
cd "$work"
git init -q -b main .
git config user.email t@test.invalid; git config user.name t
commit() { git commit -q --allow-empty -m "$1"; git rev-parse HEAD; }

c1="$(commit one)"; c2="$(commit two)"; c3="$(commit three)"; c4="$(commit four)"
git update-ref refs/remotes/origin/main "$c4"   # the remote is ahead of...
git reset -q --hard "$c3"                       # ...local main and HEAD
git checkout -q -b side "$c2"; side="$(commit side)"
git checkout -q main
# HEAD is c3, origin/main is c4, and a side branch exists off c2.

check "identical is current"                current        "$(describe_live_state "$c3" "$c3")"
check "an earlier commit is behind"         behind         "$(describe_live_state "$c3" "$c1")"
check "a later commit on main is ahead"     ahead          "$(describe_live_state "$c1" "$c3")"
# The one that dies if the classifier reads HEAD or local main instead of the
# remote: c4 is on origin/main and is not reachable from HEAD.
check "a commit only on origin/main"        ahead          "$(describe_live_state "$c3" "$c4")"
check "an unmerged branch is off-main"      off-main       "$(describe_live_state "$c3" "$side")"
check "an unknown sha"                      unknown-commit "$(describe_live_state "$c3" "$(printf '0%.0s' $(seq 40))")"
check "an unresolvable expected side"       unknown-commit "$(describe_live_state "$(printf 'f%.0s' $(seq 40))" "$c3")"
check "a dirty build"                       dirty          "$(describe_live_state "$c3" "${c1}-dirty")"
check "missing passes through"              missing        "$(describe_live_state "$c3" missing)"
check "unreachable passes through"          unreachable    "$(describe_live_state "$c3" unreachable)"
check "unreadable passes through"           unreadable     "$(describe_live_state "$c3" unreadable)"

# A descendant of the tip that is not on main. Calling this "ahead" would
# certify hand-published, unreviewed content as healthy every morning.
git checkout -q -b tip-child "$c4"; tipchild="$(commit "built on the remote tip")"; git checkout -q main
check "a descendant of the remote tip"      off-main       "$(describe_live_state "$c3" "$tipchild")"

# And the branch that must not be swallowed: an unresolvable comparison ref is a
# broken checkout, not evidence that the live commit is off main.
git update-ref -d refs/remotes/origin/main
check "no comparison ref is not off-main"   unknown-ref    "$(describe_live_state "$c3" "$c1")"

# ------------------------------------------------- the workflow handles them
# Every verdict the classifier can emit needs an arm in the check job. Adding a
# verdict and forgetting the arm sends it to the catch-all, which reports
# "unrecognised" on a perfectly good answer.
cd "$here/../.."
workflow=".github/workflows/publish.yml"
if [ -f "$workflow" ]; then
  for verdict in current ahead behind off-main unknown-commit unknown-ref dirty missing unreachable unreadable; do
    if grep -Eq "^ +${verdict}\)" "$workflow"; then
      pass=$((pass+1)); printf '  ok    the workflow handles %s\n' "$verdict"
    else
      fail=$((fail+1)); printf '  FAIL  the workflow has no arm for %s\n' "$verdict"
    fi
  done
fi

printf '\nread-live-commit: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
