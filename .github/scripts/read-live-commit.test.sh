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
    # Eight digits, not five: a five-digit number is rejected by the shape
    # check anyway, so the fixture proved nothing about the type guard.
    "numeric":    (200, "application/json", '{"commit":12345678}'),
    "object":     (200, "application/json", '{"commit":{"a":1}}'),
    "padded":     (200, "application/json", '{"commit":"  1111111111111111111111111111111111111111  "}'),
    "short_hex":  (200, "application/json", '{"commit":"abc"}'),
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
srv = http.server.HTTPServer(("127.0.0.1", 0), H)
# Bind to whatever is free and publish it. A fixed port is a landmine on the
# self-hosted pool: four runners share one machine, so two docs jobs run
# concurrently by design, the second fails to bind, and the first job's server
# answers the second job's requests. That produces a red required check on a
# pull request that changed nothing to do with this.
with open(os.path.join(WORK, "port"), "w") as fh:
    fh.write(str(srv.server_address[1]))
srv.serve_forever()
PYEOF

echo ok > "$work/mode"
python3 "$work/server.py" "$work" & server_pid=$!
port=""
for _ in $(seq 1 60); do
  if [ -s "$work/port" ]; then port="$(cat "$work/port")"; break; fi
  sleep 0.25
done
if [ -z "$port" ]; then echo "  FAIL  the fixture server never bound a port"; exit 1; fi
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
check "an override is honored" "http://example.invalid/version.json" \
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
check "and resolve_main_ref says so without failing" "origin/main" "$(resolve_main_ref)"
# Restored: everything below compares against it, and leaving it deleted made
# four later assertions fail for a reason that had nothing to do with them.
git update-ref refs/remotes/origin/main "$c4"

# --------------------------------------------- the decision the workflow makes
# Executed, not grepped. The previous version of this file checked that the
# workflow contained an arm per verdict and never ran one, so eight mutations
# of the YAML — including inverting the tip guard and making the deploy proof
# compare a value against itself — all passed a green run. The logic moved into
# this file precisely so these can be exercised.

verdict_exit() { # verdict_exit <expected> <live>  -> "<exit> <first annotation>"
  local out rc
  out="$(report_live_state "$1" "$2" 2>&1)"; rc=$?
  printf '%s %s' "$rc" "$(printf '%s' "$out" | grep -o '::error title=[^:]*' | head -1)"
}

check "current exits 0"        "0 "                                        "$(verdict_exit "$c3" "$c3")"
check "ahead exits 0"          "0 "                                        "$(verdict_exit "$c1" "$c3")"
check "behind exits 1, named"  "1 ::error title=Published site is behind"  "$(verdict_exit "$c3" "$c1")"
check "off-main exits 1"       "1 ::error title=The live site was published from something that is not main" "$(verdict_exit "$c3" "$side")"
check "dirty exits 1"          "1 ::error title=The live site was built from a modified tree" "$(verdict_exit "$c3" "${c1}-dirty")"
check "missing exits 1"        "1 ::error title=The version endpoint is not deployed" "$(verdict_exit "$c3" missing)"
check "unreachable exits 1"    "1 ::error title=No usable response from the docs site" "$(verdict_exit "$c3" unreachable)"
check "an unknown build exits 1" "1 ::error title=The live site cannot say what it was built from" "$(verdict_exit "$c3" unknown)"
check "unreadable exits 1"       "1 ::error title=The version endpoint answered with something else" "$(verdict_exit "$c3" unreadable)"
check "an unknown commit exits 1" "1 ::error title=The live commit is unknown here" "$(verdict_exit "$c3" "$(printf '0%.0s' $(seq 40))")"
# The arm the last mutation round slipped past: nothing asserted its exit code.
saved_main="$(git rev-parse refs/remotes/origin/main)"
git update-ref -d refs/remotes/origin/main
check "an unresolvable ref exits 1" "1 ::error title=Cannot compare, main does not resolve here" "$(verdict_exit "$c3" "$c1")"
git update-ref refs/remotes/origin/main "$saved_main"

# `behind` must name the commits, not merely say it is behind.
behind_out="$(report_live_state "$c3" "$c1" 2>&1 || true)"
check "behind lists the unpublished commits" "yes" \
      "$(printf '%s' "$behind_out" | grep -q 'Unpublished commits:' && printf '%s' "$behind_out" | grep -q "$(git log --format=%s -1 "$c3")" && echo yes || echo no)"

# ------------------------------------------------ the publish/refuse decision
target() { # target <event> <ref> <deploy> <tip> -> exit code
  check_deploy_target "$1" "$2" "$3" "$4" >/dev/null 2>&1; echo $?
}
check "the tip publishes"                    0 "$(target workflow_run refs/heads/main "$c3" "$c3")"
check "a superseded commit does not publish" 2 "$(target workflow_run refs/heads/main "$c1" "$c3")"
check "a branch dispatch is refused"         1 "$(target workflow_dispatch refs/heads/side "$side" "$c3")"
check "a main dispatch at the tip publishes" 0 "$(target workflow_dispatch refs/heads/main "$c3" "$c3")"
# A branch that happens to point at main's tip is the same commit, so refusing
# it would be refusing something legitimate.
check "a branch dispatch at the tip publishes" 0 "$(target workflow_dispatch refs/heads/side "$c3" "$c3")"

# ------------------------------------------- the contract the helper promises
# "never returns an empty string and never exits non-zero". Nothing tested it,
# and five mutations that break it survived: every call site used the value as
# an argument, which discards the status. A one-character regression there
# removes the retry loop, the verdict and the whole diagnostic.
echo ok > "$work/mode"
# The port file is removed first. Left in place from the earlier server, this
# read the old, now-dead port, every request failed, and all five assertions
# below passed against `unreachable` without exercising a single one of the
# paths they name. Found by mutation testing rather than by reading.
rm -f "$work/port"
python3 "$work/server.py" "$work" & server_pid=$!
port=""; for _ in $(seq 1 60); do [ -s "$work/port" ] && { port="$(cat "$work/port")"; break; }; sleep 0.25; done
if [ -z "$port" ]; then echo "  FAIL  the second fixture server never bound"; exit 1; fi
export DOCS_SITE_URL="http://127.0.0.1:${port}"
# Proven live rather than assumed, so a silent fixture failure cannot make the
# assertions below vacuous a second time.
echo ok > "$work/mode"
check "the fixture server is answering" "1111111111111111111111111111111111111111" "$(read_live_commit)"
for mode in ok notfound server_err html nokey short_hex; do
  echo "$mode" > "$work/mode"
  set +e; read_live_commit >/dev/null 2>&1; rc=$?; set -e
  check "read_live_commit exits 0 on ${mode}" 0 "$rc"
done
# A short hex string is the one the shape bounds exist for: `{1,40}` would
# accept it and hand a three-character value on as a commit.
echo short_hex > "$work/mode"
check "a short hex commit is refused" unreadable "$(read_live_commit)"
set +e; DOCS_SITE_URL='http://127.0.0.1:9' read_live_commit >/dev/null 2>&1; rc=$?; set -e
check "read_live_commit exits 0 when unreachable" 0 "$rc"
kill "$server_pid" 2>/dev/null || true; server_pid=""
unset DOCS_SITE_URL

# ------------------------------------------------- the workflow calls into it
# Presence, not behavior — the behavior is covered above. This catches the
# workflow being rewired to do its own thing again.
cd "$here/../.."
workflow=".github/workflows/publish.yml"
if [ ! -f "$workflow" ]; then
  # Reporting green because the file moved is how the only workflow coverage
  # here would disappear without anyone noticing.
  fail=$((fail+1)); printf '  FAIL  %s does not exist\n' "$workflow"
else
  for fn in report_live_state check_deploy_target resolve_main_ref read_live_commit; do
    if grep -q "$fn" "$workflow"; then
      pass=$((pass+1)); printf '  ok    the workflow calls %s\n' "$fn"
    else
      fail=$((fail+1)); printf '  FAIL  the workflow no longer calls %s\n' "$fn"
    fi
  done
fi

printf '\nread-live-commit: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
