#!/usr/bin/env bash
# Exercises the freshness guard against a real HTTP server.
#
# This guard exists because nothing else notices a checker that stops, so a
# guard that silently stops working reproduces exactly the failure it was
# written to close. It runs from a manual dispatch and its own classification is
# never otherwise executed, which is the same gap `read-live-commit.test.sh`
# was written to fill.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${here}/check-store-freshness.sh"

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
cat > "$work/server.py" <<'PYEOF'
import http.server, os, socketserver, sys
WORK = sys.argv[1]
BODIES = {
    "ok":        (200, "application/json", '{"up":3,"down":0,"updatedAt":1788700000,"monitors":{}}'),
    "float":     (200, "application/json", '{"updatedAt":1788700000.7}'),
    "nokey":     (200, "application/json", '{"up":3,"down":0}'),
    "nullkey":   (200, "application/json", '{"updatedAt":null}'),
    # A string that would satisfy the shape check if the type guard were not
    # there, carrying a second line the runner would parse as a workflow
    # command. The guard is what stops it, so the fixture has to offer it.
    "injected":  (200, "application/json", '{"updatedAt":"1788700000\\n::error title=INJECTED::hi"}'),
    "html":      (200, "text/html", "<!doctype html><html><body>not json</body></html>"),
    "blank":     (200, "application/json", ""),
    # What the endpoint itself answers when the store holds nothing at all.
    "no_data":   (500, "application/json", '{"error":"No data available"}'),
    "server_err":(500, "text/html", "<html>upstream exploded</html>"),
    "notfound":  (404, "text/html", "<html>no such route</html>"),
    "forbidden": (403, "text/html", "<html>blocked</html>"),
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
class Server(http.server.HTTPServer):
    # No reverse-DNS lookup on bind. Nothing reads server_name, and a fixture
    # that can stall on the network before it binds reports a DNS problem as a
    # broken guard.
    def server_bind(self):
        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = self.server_address[:2]

# Port zero, published to a file. Four runners share the self-hosted machine,
# so a fixed port means the second job's requests reach the first job's server.
srv = Server(("127.0.0.1", 0), H)
tmp = os.path.join(WORK, "port.tmp")
with open(tmp, "w") as fh:
    fh.write(str(srv.server_address[1]))
os.replace(tmp, os.path.join(WORK, "port"))
print(f"fixture listening on {srv.server_address[1]}", file=sys.stderr, flush=True)
srv.serve_forever()
PYEOF

echo ok > "$work/mode"
python3 -u "$work/server.py" "$work" > "$work/server.log" 2>&1 & server_pid=$!
port=""
for _ in $(seq 1 120); do
  if [ -s "$work/port" ]; then port="$(cat "$work/port")"; break; fi
  sleep 0.25
done
if [ -z "$port" ]; then
  echo "  FAIL  the fixture server never bound a port"
  sed 's/^/        /' "$work/server.log" 2>/dev/null || echo "        (none)"
  exit 1
fi
for _ in $(seq 1 40); do
  curl -s -o /dev/null --max-time 1 "http://127.0.0.1:${port}/api/data" && break || sleep 0.25
done

export STATUS_SITE_URL="http://127.0.0.1:${port}"

reads() { echo "$1" > "$work/mode"; read_store_updated_at; }

echo "read_store_updated_at"
check "a healthy response yields the timestamp"     1788700000 "$(reads ok)"
check "a fractional timestamp is floored"           1788700000 "$(reads float)"
check "a body with no updatedAt is unreadable"      unreadable "$(reads nokey)"
check "a null updatedAt is unreadable"              unreadable "$(reads nullkey)"
check "a string updatedAt is refused by the type guard" unreadable "$(reads injected)"
check "an HTML 200 is unreadable"                   unreadable "$(reads html)"
check "an empty 200 body is unreadable"             unreadable "$(reads blank)"
check "the endpoint's own empty-store answer is named" empty    "$(reads no_data)"
check "a 500 that is not that answer is unreachable" unreachable "$(reads server_err)"
check "a 404 is unreachable"                        unreachable "$(reads notfound)"
check "a 403 is unreachable"                        unreachable "$(reads forbidden)"
check "a redirect is not followed"                  unreachable "$(reads redirect)"

# The injection the type guard exists to stop. Whatever the endpoint returns,
# the value handed to an `::error` annotation may never carry a second line,
# which the runner would parse as a workflow command of its own.
echo injected > "$work/mode"
check "the value is always a single line" 0 "$(read_store_updated_at | wc -l | tr -d ' ')"
check "no annotation text survives the read" 0 \
  "$(read_store_updated_at | grep -c '::error' || true)"

# Set inside the substitution: an assignment prefixed to `check` would not be
# in scope for the `$(...)` that produces its argument, and the test would
# quietly measure the fixture's URL instead.
check "a trailing slash is not doubled" 0 \
  "$(STATUS_SITE_URL='https://example.test/'; store_data_url | grep -c 'example.test//' || true)"
check "the URL carries a cache-buster" 1 \
  "$(STATUS_SITE_URL='https://example.test'; store_data_url | grep -c 'cb=' || true)"
check "the default is the status host, not the docs host" 1 \
  "$(unset STATUS_SITE_URL; store_data_url | grep -c '^https://status\.marfa\.so/api/data?cb=' || true)"

# --------------------------------------------------------------- age cases
echo
echo "describe_store_age"
NOW=1788700000

check "the window is three write intervals" 540 "$STORE_MAX_AGE_SECONDS"
check "a write seconds ago is fresh"   fresh "$(describe_store_age $((NOW - 5)) "$NOW")"
check "a write at the window edge is fresh" fresh \
  "$(describe_store_age $((NOW - STORE_MAX_AGE_SECONDS)) "$NOW")"
check "one second past the window is stale" stale \
  "$(describe_store_age $((NOW - STORE_MAX_AGE_SECONDS - 1)) "$NOW")"
check "a long-dead checker is stale" stale "$(describe_store_age $((NOW - 86400)) "$NOW")"
# Two clocks disagreeing by a few seconds is ordinary and is not a finding.
check "a slightly future timestamp is still fresh" fresh \
  "$(describe_store_age $((NOW + 30)) "$NOW")"
check "a wildly future timestamp is a clock problem" ahead-of-clock \
  "$(describe_store_age $((NOW + 4000)) "$NOW")"
check "empty passes through"       empty       "$(describe_store_age empty "$NOW")"
check "unreachable passes through" unreachable "$(describe_store_age unreachable "$NOW")"
check "unreadable passes through"  unreadable  "$(describe_store_age unreadable "$NOW")"

echo
echo "report_store_age"
status() { report_store_age "$1" "$NOW" >/dev/null 2>&1 && echo 0 || echo 1; }
check "a fresh store passes"        0 "$(status $((NOW - 10)))"
check "a stale store fails"         1 "$(status $((NOW - 4000)))"
check "an empty store fails"        1 "$(status empty)"
check "an unreachable endpoint fails" 1 "$(status unreachable)"
check "an unreadable body fails"    1 "$(status unreadable)"
check "a future timestamp fails"    1 "$(status $((NOW + 4000)))"
# An unhandled verdict must fail rather than fall through to success, which is
# how a guard reports green about a question it did not answer.
check "an unrecognized verdict fails" 1 "$(status wat)"

check "a stale report names the age and the window" 1 \
  "$(report_store_age $((NOW - 4000)) "$NOW" | grep -c 'past the 540s window')"

# ------------------------------------------------------------ the wiring
echo
echo "the workflow"
workflow="${here}/../workflows/publish.yml"
if [ ! -f "$workflow" ]; then
  fail=$((fail+1)); printf '  FAIL  publish.yml not found at %s\n' "$workflow"
else
  body="$(grep -v '^\s*#' "$workflow")"
  if [[ $body == *"check-store-freshness.sh"* ]]; then
    pass=$((pass+1)); printf '  ok    the workflow sources the freshness guard\n'
  else
    fail=$((fail+1)); printf '  FAIL  the workflow no longer sources check-store-freshness.sh\n'
  fi
fi

printf '\ncheck-store-freshness: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
