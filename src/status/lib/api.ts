import type { CompactedState, PageMeta } from './types';
import { PUBLIC_MONITORS, getIncident, incidentCount, isSentinel, lastLatency } from './state';

/** The canonical public address, used for absolute links in the feed. */
export const SITE_URL = 'https://status.marfa.so';

export type ApiMonitor = {
  up: boolean;
  latency: number;
  location: string;
  message: string;
};

export type ApiResponse = {
  up: number;
  down: number;
  updatedAt: number;
  monitors: Record<string, ApiMonitor>;
  maintenances: unknown[];
};

/**
 * The machine-readable record, at the shape it already had.
 *
 * Only the monitors in `PUBLIC_MONITORS`, the same set the page renders. The
 * store keeps state and labels for monitors that are no longer configured, and
 * reporting them would show a monitor nobody watches as down for good. The
 * navbar indicator on the documentation site reads this response, so a stale
 * entry here would reach every reader.
 *
 * The counts are taken from the monitors reported, not from the checker's
 * totals, which span everything it ever wrote.
 *
 * The shape is reproduced rather than improved on. It is the only published
 * contract this page has, and changing it during a hosting move would make two
 * failures look like one.
 */
export function buildApiResponse(state: CompactedState, meta: PageMeta | null): ApiResponse {
  const monitors: Record<string, ApiMonitor> = {};

  for (const monitor of meta?.monitors ?? []) {
    if (!isPublicMonitor(monitor.id)) continue;

    const last = getIncident(state, monitor.id, incidentCount(state, monitor.id) - 1);
    const open = last !== null && !isSentinel(last) && last.end === null;
    const latency = lastLatency(state, monitor.id);

    monitors[monitor.id] = {
      up: !open,
      // The previous implementation threw here on a monitor with no samples,
      // taking the whole endpoint down with it. Zero reads as "not measured"
      // and keeps the field a number, which is what the shape promises.
      latency: latency?.ping ?? 0,
      location: latency?.loc ?? '',
      message: open && last ? last.error[last.error.length - 1] : 'OK',
    };
  }

  const reported = Object.values(monitors);

  return {
    up: reported.filter((monitor) => monitor.up).length,
    down: reported.filter((monitor) => !monitor.up).length,
    updatedAt: state.lastUpdate,
    monitors,
    maintenances: meta?.maintenances ?? [],
  };
}

function isPublicMonitor(id: string): boolean {
  return (PUBLIC_MONITORS as readonly string[]).includes(id);
}

export const API_HEADERS = {
  'content-type': 'application/json',
  // Already the case on the endpoint being replaced, and the navbar indicator
  // on the documentation site reads this cross-origin.
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
  'cache-control': 'public, max-age=30',
};
