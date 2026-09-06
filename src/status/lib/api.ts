import type { CompactedState, PageMeta } from './types';
import { getIncident, incidentCount, isSentinel, lastLatency } from './state';

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
 * Every monitor, staging included: this is the record rather than the public
 * answer, and a consumer that wants only the rendered set filters by the
 * public list. The one place that matters today is the navbar indicator, which
 * does exactly that — the alternative, filtering here, would decide for every
 * future consumer that pre-production is none of its business.
 *
 * The shape is reproduced rather than improved on. It is the only published
 * contract this page has, and changing it during a hosting move would make two
 * failures look like one.
 */
export function buildApiResponse(state: CompactedState, meta: PageMeta | null): ApiResponse {
  const monitors: Record<string, ApiMonitor> = {};

  for (const monitor of meta?.monitors ?? []) {
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

  return {
    up: state.overallUp,
    down: state.overallDown,
    updatedAt: state.lastUpdate,
    monitors,
    maintenances: meta?.maintenances ?? [],
  };
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
