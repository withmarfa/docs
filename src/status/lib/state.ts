import type { CompactedState, IncidentRecord, LatencyRecord, PageMeta } from './types';

/**
 * Reading the checker's store, and turning it into a page.
 *
 * Pure: everything here takes strings and returns data. The binding lives in
 * `store.ts`, so this module can be tested without a Workers runtime.
 */

/**
 * The monitors this page renders.
 *
 * Staging is still checked and still alerted on. It is not rendered, because
 * the only question this page answers is whether a user can be served, and
 * nobody is served by staging. It stays in the JSON endpoint, which is the
 * machine-readable record rather than the public answer.
 *
 * One constant, exported, because the page, the feed and the navbar indicator
 * all filter by it and three copies would drift.
 */
export const PUBLIC_MONITORS = ['api', 'api-files', 'docs'] as const;

/** Retention in the checker, and therefore the widest window we can report. */
export const HISTORY_WINDOW_SECONDS = 90 * 24 * 60 * 60;

/**
 * The checker re-seeds a zero-length placeholder incident at the far edge of
 * the retention window on every tick, so that the window always has a floor.
 * It is bookkeeping, not an outage, and it is never absent for long enough to
 * treat its presence as a signal.
 */
const SENTINEL_ERROR = 'dummy';

const nativeFromHex = (Uint8Array as unknown as { fromHex?: (hex: string) => Uint8Array })
  .fromHex;

/**
 * Deliberately a runtime check rather than a compiler suppression.
 *
 * `Uint8Array.fromHex` exists in workerd and in current browsers and does not
 * exist in the Node types this repository compiles against. Suppressing that
 * with directives works until the day it lands in the configured library, at
 * which point every suppression becomes an unused-directive error and the type
 * check goes red for a reason nobody connects to a status page.
 */
function hexToBytes(hex: string): Uint8Array {
  if (nativeFromHex) return nativeFromHex(hex);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

const EMPTY_STATE: CompactedState = {
  lastUpdate: 0,
  overallUp: 0,
  overallDown: 0,
  incident: {},
  latency: {},
};

/**
 * Never throws. A store that is empty, half-written or from a future shape of
 * the checker has to render as "no data" rather than as a 500 — an outage is
 * exactly when this page is read, and it is also exactly when the store is
 * most likely to be odd.
 */
export function parseState(raw: string | null): CompactedState {
  if (!raw) return EMPTY_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<CompactedState>;
    return {
      lastUpdate: parsed.lastUpdate ?? 0,
      overallUp: parsed.overallUp ?? 0,
      overallDown: parsed.overallDown ?? 0,
      incident: parsed.incident ?? {},
      latency: parsed.latency ?? {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function parseMeta(raw: string | null): PageMeta | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PageMeta>;
    if (!Array.isArray(parsed.monitors)) return null;
    return {
      title: parsed.title,
      group: parsed.group,
      monitors: parsed.monitors,
      maintenances: Array.isArray(parsed.maintenances) ? parsed.maintenances : [],
    };
  } catch {
    return null;
  }
}

export function incidentCount(state: CompactedState, id: string): number {
  return state.incident[id]?.start.length ?? 0;
}

export function getIncident(
  state: CompactedState,
  id: string,
  index: number,
): IncidentRecord | null {
  const column = state.incident[id];
  if (!column || index < 0 || index >= column.start.length) return null;
  return {
    start: column.start[index],
    end: column.end[index],
    error: column.error[index],
  };
}

export function isSentinel(incident: IncidentRecord): boolean {
  return incident.error[0] === SENTINEL_ERROR;
}

/**
 * `start` is an array and `end` is a scalar, which reads like a mistake and is
 * not: when the error text changes inside an open incident the checker pushes
 * another start rather than opening a second incident. So the outage began at
 * the first start, and the reason it is still open is the last error.
 */
export function incidentDuration(incident: IncidentRecord, now: number): number {
  return Math.max(0, (incident.end ?? now) - incident.start[0]);
}

export function latencyCount(state: CompactedState, id: string): number {
  // Hex-encoded Uint16: four characters per sample.
  const series = state.latency[id];
  return series ? series.ping.length / 4 : 0;
}

/**
 * The last sample, or null.
 *
 * The upstream accessor slices unguarded and throws on a monitor with no
 * samples yet, which is a 500 on the whole page rather than one blank row. A
 * monitor added an hour ago is a completely ordinary reason to have none.
 */
export function lastLatency(state: CompactedState, id: string): LatencyRecord | null {
  if (latencyCount(state, id) === 0) return null;
  const series = state.latency[id];
  return {
    time: new Uint32Array(hexToBytes(series.time.slice(-8)).buffer)[0],
    ping: new Uint16Array(hexToBytes(series.ping.slice(-4)).buffer)[0],
    loc: series.loc.v[series.loc.v.length - 1],
  };
}

/** The full 12-hour series for one monitor. Used only by the chart. */
export function latencySeries(state: CompactedState, id: string): LatencyRecord[] {
  const series = state.latency[id];
  if (!series) return [];
  const times = new Uint32Array(hexToBytes(series.time).buffer);
  const pings = new Uint16Array(hexToBytes(series.ping).buffer);
  const locations: string[] = [];
  series.loc.c.forEach((count, index) => {
    for (let i = 0; i < count; i++) locations.push(series.loc.v[index]);
  });
  const length = Math.min(times.length, pings.length);
  const out: LatencyRecord[] = [];
  for (let i = 0; i < length; i++) {
    out.push({ time: times[i], ping: pings[i], loc: locations[i] ?? '' });
  }
  return out;
}

export type Incident = {
  monitorId: string;
  monitorName: string;
  start: number;
  end: number | null;
  error: string;
  durationSeconds: number;
};

export type MonitorView = {
  id: string;
  name: string;
  tooltip?: string;
  link?: string;
  up: boolean;
  /** When the current outage began. Null when up. */
  downSince: number | null;
  error: string | null;
  latencyMs: number | null;
  location: string | null;
  /** Fraction in [0, 1] over the retention window. */
  uptime: number;
  /**
   * Response times only, not the full samples. The whole series is serialized
   * into the page for hydration, and the timestamps and colo codes triple that
   * payload to draw a line that uses neither.
   */
  series: number[];
};

export type StatusView = {
  lastUpdate: number;
  monitors: MonitorView[];
  incidents: Incident[];
  /** True only when every rendered monitor is up. */
  allUp: boolean;
  downCount: number;
  /** No usable state in the store at all. */
  empty: boolean;
};

/**
 * Real outages for one monitor, oldest first, sentinel excluded.
 */
function realIncidents(state: CompactedState, id: string): IncidentRecord[] {
  const out: IncidentRecord[] = [];
  for (let i = 0; i < incidentCount(state, id); i++) {
    const incident = getIncident(state, id, i);
    if (incident && !isSentinel(incident)) out.push(incident);
  }
  return out;
}

/**
 * Uptime over the retention window.
 *
 * The denominator is the window rather than the time this page has been
 * observing, because the checker discards anything older and there is nothing
 * left to derive a shorter honest window from. It reads high for the first
 * ninety days of a new monitor. Labelled with the window for that reason.
 */
function uptimeFraction(incidents: IncidentRecord[], now: number): number {
  const windowStart = now - HISTORY_WINDOW_SECONDS;
  let down = 0;
  for (const incident of incidents) {
    const start = Math.max(incident.start[0], windowStart);
    const end = incident.end ?? now;
    if (end > start) down += end - start;
  }
  return Math.max(0, Math.min(1, 1 - down / HISTORY_WINDOW_SECONDS));
}

/**
 * Build everything the page renders, for the given set of monitor ids.
 *
 * `now` is injected so the tests are not a clock.
 */
export function buildView(
  state: CompactedState,
  meta: PageMeta | null,
  ids: readonly string[],
  now: number,
): StatusView {
  const labels = new Map((meta?.monitors ?? []).map((m) => [m.id, m]));

  const monitors: MonitorView[] = ids.map((id) => {
    const label = labels.get(id);
    const incidents = realIncidents(state, id);
    const last = getIncident(state, id, incidentCount(state, id) - 1);
    // An open incident is the only thing that means "down right now".
    const open = last && !isSentinel(last) && last.end === null ? last : null;
    const latency = lastLatency(state, id);

    return {
      id,
      // Falling back to the id rather than to a blank keeps a monitor that was
      // renamed in the checker visible here instead of silently unlabelled.
      name: label?.name ?? id,
      tooltip: label?.tooltip,
      link: label?.statusPageLink,
      up: open === null,
      downSince: open ? open.start[0] : null,
      error: open ? open.error[open.error.length - 1] : null,
      latencyMs: latency?.ping ?? null,
      location: latency?.loc ?? null,
      uptime: uptimeFraction(incidents, now),
      series: latencySeries(state, id).map((sample) => sample.ping),
    };
  });

  const incidents: Incident[] = [];
  for (const monitor of monitors) {
    for (const incident of realIncidents(state, monitor.id)) {
      incidents.push({
        monitorId: monitor.id,
        monitorName: monitor.name,
        start: incident.start[0],
        end: incident.end,
        error: incident.error[incident.error.length - 1],
        durationSeconds: incidentDuration(incident, now),
      });
    }
  }
  incidents.sort((a, b) => b.start - a.start);

  const downCount = monitors.filter((m) => !m.up).length;

  return {
    lastUpdate: state.lastUpdate,
    monitors,
    incidents,
    allUp: downCount === 0,
    downCount,
    empty: state.lastUpdate === 0,
  };
}
