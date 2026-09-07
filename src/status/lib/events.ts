import type { Incident } from './state';

/**
 * Turning incidents into events.
 *
 * `API` and `File storage` are two monitors against one URL — the same
 * `/health` document, matched on different components — so a single 502 fails
 * both and the checker writes two identical incidents. Listed per monitor,
 * every outage this deployment can have appears twice, and a reader counting
 * rows counts twice the number of things that went wrong.
 *
 * Grouping is presentation only. The store keeps one record per monitor,
 * because that is what the uptime bar and the per-monitor history are computed
 * from, and `/api/data` publishes them unchanged.
 */

export type StatusEvent = {
  start: number;
  end: number | null;
  durationSeconds: number;
  /** Every monitor caught by this event, in the order the page lists them. */
  monitorIds: string[];
  monitorNames: string[];
  /** The checker's error text, unchanged. Render it through `describeCause`. */
  error: string;
};

/**
 * How far apart two incidents can start and still be one event.
 *
 * The checker walks its monitors inside a single scheduled run, so two
 * monitors failing on the same tick are stamped seconds apart rather than
 * identically. Ninety seconds is comfortably wider than one pass and narrower
 * than the one-minute cadence doubled, so it cannot swallow a genuinely
 * separate outage on the following tick.
 */
const SAME_EVENT_SECONDS = 90;

/**
 * Group incidents into events, newest first.
 *
 * Two incidents are the same event when they start close together and carry
 * the same error text. The error has to match: two monitors failing at once
 * for different reasons are two things happening, and saying otherwise would
 * hide one of them behind the other's cause.
 */
export function groupIncidents(incidents: Incident[]): StatusEvent[] {
  const events: StatusEvent[] = [];

  for (const incident of incidents) {
    const match = events.find(
      (event) =>
        Math.abs(event.start - incident.start) <= SAME_EVENT_SECONDS &&
        event.error === incident.error,
    );

    if (match) {
      match.monitorIds.push(incident.monitorId);
      match.monitorNames.push(incident.monitorName);
      // The event began when the first of them did and is over only when the
      // last one recovers, so an open incident keeps the whole event open.
      match.start = Math.min(match.start, incident.start);
      match.end =
        match.end === null || incident.end === null
          ? null
          : Math.max(match.end, incident.end);
      match.durationSeconds = Math.max(match.durationSeconds, incident.durationSeconds);
      continue;
    }

    events.push({
      start: incident.start,
      end: incident.end,
      durationSeconds: incident.durationSeconds,
      monitorIds: [incident.monitorId],
      monitorNames: [incident.monitorName],
      error: incident.error,
    });
  }

  return events;
}

/**
 * The checker's error text, in words a reader has a use for.
 *
 * Its strings describe the check rather than the outage — `Expected codes:
 * 2xx, Got: 502` is addressed to whoever configured the monitor. Anything
 * unrecognized passes through unchanged, so a new failure mode is verbose here
 * rather than invisible.
 */
export function describeCause(error: string): string {
  const status = /Got:\s*(\d{3})/.exec(error)?.[1];
  if (status) return `HTTP ${status}`;
  if (error.includes('keyword')) return 'Unhealthy response';
  if (/timeout|timed out|aborted/i.test(error)) return 'No response';
  return error;
}

/** "API", "API and File storage", "API, File storage and Documentation". */
export function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
