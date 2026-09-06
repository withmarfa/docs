#!/usr/bin/env bash
# Whether the checker is still writing, which nothing else asks.
#
# The status page renders whatever the store last held. A checker that stops
# leaves the page green, plausible and frozen: every monitor still says
# operational, the uptime bar is still full, and the only tell is the
# "last checked" line, which needs a person to read it and notice. Nothing
# alerts, because nothing is failing — the page is serving exactly what it was
# built to serve.
#
# This is the one check that runs outside Cloudflare entirely. The checker, the
# store and the page all live there; a hosted runner asking the page how old its
# data is survives the failure it is looking for, which is the only property
# that makes an external check worth having.
#
# Sourced by the Publish workflow's status check and driven directly by
# `check-store-freshness.test.sh`. Like `read-live-commit.sh`, every failure is
# a word rather than an exit code, because `VALUE="$(curl ... | jq ...)"` under
# `bash -e` takes jq's status and would kill the calling step on exactly the
# transient it exists to report.
#
#   <epoch>      the store's own `updatedAt`
#   empty        the endpoint answered, and says it has no data at all
#   unreachable  no usable response
#   unreadable   a 2xx whose body is not the status document

# The checker writes at most once per `kvWriteCooldownMinutes`, which its
# configuration leaves unset and which defaults to three. Three of those is the
# threshold: it cannot fire on an ordinary slow tick or a skipped write, and a
# store older than that has stopped being written rather than lagged.
#
# Derived rather than written as 540, so the two move together if the checker's
# cadence ever changes.
STORE_WRITE_INTERVAL_SECONDS="${STORE_WRITE_INTERVAL_SECONDS:-180}"
STORE_MAX_AGE_SECONDS=$((STORE_WRITE_INTERVAL_SECONDS * 3))

# The endpoint polled. Its own function so the default is reachable from a test
# without a network call.
store_data_url() {
  local base
  # The status host, not the docs host: `/api/data` exists on one of them. The
  # workflow overrides this, and a third party running it polls their own
  # deployment rather than being told ours is stale.
  base="${STATUS_SITE_URL:-https://status.marfa.so}"
  # A cache-buster. The endpoint sets a 30-second `max-age` quite deliberately,
  # and a check asking how fresh the data is must not be answered from a cache.
  printf '%s/api/data?cb=%s-%s' "${base%/}" "${GITHUB_RUN_ID:-$$}" "${RANDOM:-0}"
}

read_store_updated_at() {
  local url body code tmp value

  url="$(store_data_url)"
  tmp="$(mktemp)"
  # Same shape as `read_live_commit`, and for the same reasons: no `--fail`,
  # which discards the body that distinguishes an empty store from a dead one;
  # no `--location`, because a redirect is a real answer about the deployment.
  code="$(curl --silent --show-error --max-time 20 --write-out '%{http_code}' \
            --output "$tmp" "$url")" || code=''
  if ! printf '%s' "$code" | grep -Eq '^[0-9]{3}$'; then
    rm -f "$tmp"; printf 'unreachable'; return 0
  fi

  body="$(cat "$tmp")"; rm -f "$tmp"

  case "$code" in
    2*) ;;
    # The endpoint answers 500 with `{"error": "No data available"}` when the
    # store holds nothing at all. That is the most serious thing this check can
    # find and it must not be filed under "the site is down", which is a
    # statement about something else entirely.
    500)
      if printf '%s' "$body" | jq -e 'has("error")' >/dev/null 2>&1; then
        printf 'empty'; return 0
      fi
      printf 'unreachable'; return 0 ;;
    *) printf 'unreachable'; return 0 ;;
  esac

  value="$(printf '%s' "$body" \
    | jq -r 'if (.updatedAt | type) == "number" then (.updatedAt | floor) else empty end' 2>/dev/null)" \
    || value=''

  # Shape-checked before it leaves, and the line count first and separately.
  # `grep -E '^...$'` anchors per line rather than per string, so a value whose
  # first line looks like a number passes it carrying whatever follows — into
  # an `echo "::error ...::${VALUE}"`, where the runner parses the second line
  # as a workflow command.
  if [ "$(printf '%s' "$value" | wc -l | tr -d ' ')" != "0" ] \
     || ! printf '%s' "$value" | grep -Eq '^[0-9]+$'; then
    printf 'unreadable'; return 0
  fi
  printf '%s' "$value"
}

# describe_store_age <value> <now>
#
# One word. The caller owns the wording and the exit code.
#
#   fresh           written within the window
#   stale           the checker has stopped writing
#   ahead-of-clock  stamped in the future by more than one write interval
#   empty / unreachable / unreadable  passed straight through
describe_store_age() {
  local value="$1" now="$2" age

  case "$value" in
    *[!0-9]*|"") printf '%s' "$value"; return 0 ;;
  esac

  age=$((now - value))

  # A store stamped slightly ahead is two clocks disagreeing, which is ordinary
  # and is not a freshness finding. Well ahead is a broken clock at one end or
  # the other, and reporting that as `fresh` would hide it forever.
  if [ "$age" -lt "-${STORE_WRITE_INTERVAL_SECONDS}" ]; then
    printf 'ahead-of-clock'; return 0
  fi
  if [ "$age" -le "$STORE_MAX_AGE_SECONDS" ]; then
    printf 'fresh'; return 0
  fi
  printf 'stale'
}

# report_store_age <value> <now>
#
# Verdict to wording to exit code. Writes annotations to stdout, returns 0 only
# when the store is being written.
report_store_age() {
  local value="$1" now="$2" verdict age
  verdict="$(describe_store_age "$value" "$now")"
  echo "Store: ${value}. Verdict: ${verdict}."

  case "$verdict" in
    fresh)
      age=$((now - value))
      echo "The checker wrote ${age}s ago, inside the ${STORE_MAX_AGE_SECONDS}s window."
      return 0 ;;
    stale)
      age=$((now - value))
      echo "::error title=The checker has stopped writing::The status page is serving data ${age}s old, past the ${STORE_MAX_AGE_SECONDS}s window. Every monitor still reads operational because the page renders what the store last held, so nothing else reports this."
      return 1 ;;
    empty)
      echo "::error title=The store holds no data::The endpoint answered, and says it has nothing. The page renders as though nothing has ever been checked."
      return 1 ;;
    ahead-of-clock)
      echo "::error title=The store is stamped in the future::It reports ${value}, which is ahead of this runner's clock by more than one write interval. One of the two clocks is wrong, and freshness cannot be judged until it is known which."
      return 1 ;;
    unreachable)
      echo "::error title=No usable response from the status endpoint::That covers a transport failure and any status that is neither success nor a 500 naming an empty store. curl's own reason is in the log above."
      return 1 ;;
    unreadable)
      echo "::error title=The status endpoint answered with something else::It returned a 200 whose body carries no numeric updatedAt."
      return 1 ;;
    *)
      echo "::error title=Unrecognized verdict::describe_store_age returned '${verdict}', which this guard does not handle."
      return 1 ;;
  esac
}
