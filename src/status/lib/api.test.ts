import { describe, expect, it } from 'vitest';
import capturedState from './fixtures/captured-state.json';
import liveResponse from './fixtures/live-api-response.json';
import { buildApiResponse } from './api';
import { PUBLIC_MONITORS, parseState } from './state';
import type { CompactedState, PageMeta } from './types';

const STATE = parseState(JSON.stringify(capturedState));

/**
 * The labels as the checker last wrote them, all five monitors in its own
 * order. Four of them are no longer configured, and the store still carries
 * them, so the endpoint has to leave them out by its own list.
 */
const META: PageMeta = {
  monitors: [
    { id: 'api', name: 'API' },
    { id: 'api-files', name: 'File storage' },
    { id: 'staging', name: 'Staging API' },
    { id: 'staging-files', name: 'Staging file storage' },
    { id: 'docs', name: 'Documentation' },
  ],
  maintenances: [],
};

describe('the published contract', () => {
  // Captured from the endpoint being replaced. The move must not be visible to
  // anything reading it, so this compares the shape rather than the values,
  // which were taken at a different moment.
  it('has the same keys as the endpoint it replaces', () => {
    const built = buildApiResponse(STATE, META);
    expect(Object.keys(built).sort()).toEqual(Object.keys(liveResponse).sort());
  });

  it('reports only the configured monitors', () => {
    const built = buildApiResponse(STATE, META);
    expect(Object.keys(built.monitors)).toEqual([...PUBLIC_MONITORS]);
  });

  it('gives each monitor the same fields, with the same types, as the endpoint it replaces', () => {
    const built = buildApiResponse(STATE, META);
    for (const id of PUBLIC_MONITORS) {
      const live = liveResponse.monitors[id as keyof typeof liveResponse.monitors];
      const mine = built.monitors[id];
      expect(Object.keys(mine).sort()).toEqual(Object.keys(live).sort());
      expect(typeof mine.up).toBe('boolean');
      expect(typeof mine.latency).toBe('number');
      expect(typeof mine.location).toBe('string');
      expect(typeof mine.message).toBe('string');
    }
  });

  it('ignores stored state for a monitor that is no longer configured', () => {
    const state: CompactedState = {
      ...STATE,
      incident: {
        ...STATE.incident,
        api: {
          start: [[1_788_000_000], [1_788_650_000]],
          end: [1_788_000_000, null],
          error: [['dummy'], ['Expected codes: 2xx, Got: 530']],
        },
      },
    };
    const built = buildApiResponse(state, META);
    expect(built.monitors).not.toHaveProperty('api');
    expect(built.monitors).not.toHaveProperty('api-files');
    expect(built.monitors).not.toHaveProperty('staging');
    expect(built.down).toBe(0);
  });

  it('reports a healthy monitor as up with OK', () => {
    const built = buildApiResponse(STATE, META);
    expect(built.monitors.docs.up).toBe(true);
    expect(built.monitors.docs.message).toBe('OK');
    expect(built.monitors.docs.location).toBe('CDG');
  });

  it('reports an open incident as down, with its latest reason', () => {
    const state: CompactedState = {
      ...STATE,
      incident: {
        ...STATE.incident,
        docs: {
          start: [[1_788_000_000], [1_788_650_000]],
          end: [1_788_000_000, null],
          error: [['dummy'], ['Expected codes: 2xx, Got: 502', 'Timeout']],
        },
      },
    };
    const built = buildApiResponse(state, META);
    expect(built.monitors.docs.up).toBe(false);
    expect(built.monitors.docs.message).toBe('Timeout');
    expect(built.up).toBe(0);
    expect(built.down).toBe(1);
  });

  // The endpoint being replaced threw here, taking the whole response with it.
  it('answers for a monitor with no latency samples instead of failing', () => {
    const state: CompactedState = { ...STATE, latency: {} };
    const built = buildApiResponse(state, META);
    expect(built.monitors.docs.latency).toBe(0);
    expect(built.monitors.docs.location).toBe('');
  });

  it('counts the monitors it reports, not every monitor the checker stored', () => {
    // The checker's own totals span all five stored monitors.
    expect(STATE.overallUp).toBe(5);
    const built = buildApiResponse(STATE, META);
    expect(built.up).toBe(1);
    expect(built.down).toBe(0);
    expect(built.updatedAt).toBe(STATE.lastUpdate);
  });
});
