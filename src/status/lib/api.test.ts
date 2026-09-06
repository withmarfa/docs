import { describe, expect, it } from 'vitest';
import capturedState from './fixtures/captured-state.json';
import liveResponse from './fixtures/live-api-response.json';
import { buildApiResponse } from './api';
import { parseState } from './state';
import type { CompactedState, PageMeta } from './types';

const STATE = parseState(JSON.stringify(capturedState));

/** Exactly what the checker publishes, all five monitors, in its own order. */
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

  it('names every monitor the endpoint named, in the same order', () => {
    const built = buildApiResponse(STATE, META);
    expect(Object.keys(built.monitors)).toEqual(Object.keys(liveResponse.monitors));
  });

  it('gives each monitor the same fields, with the same types', () => {
    const built = buildApiResponse(STATE, META);
    for (const [id, live] of Object.entries(liveResponse.monitors)) {
      const mine = built.monitors[id];
      expect(Object.keys(mine).sort()).toEqual(Object.keys(live).sort());
      expect(typeof mine.up).toBe('boolean');
      expect(typeof mine.latency).toBe('number');
      expect(typeof mine.location).toBe('string');
      expect(typeof mine.message).toBe('string');
    }
  });

  it('keeps staging, because this is the record rather than the public answer', () => {
    expect(Object.keys(buildApiResponse(STATE, META).monitors)).toContain('staging');
  });

  it('reports a healthy monitor as up with OK', () => {
    const built = buildApiResponse(STATE, META);
    expect(built.monitors.api.up).toBe(true);
    expect(built.monitors.api.message).toBe('OK');
    expect(built.monitors.api.location).toBe('CDG');
  });

  it('reports an open incident as down, with its latest reason', () => {
    const state: CompactedState = {
      ...STATE,
      incident: {
        ...STATE.incident,
        api: {
          start: [[1_788_000_000], [1_788_650_000]],
          end: [1_788_000_000, null],
          error: [['dummy'], ['Expected codes: 2xx, Got: 502', 'Timeout']],
        },
      },
    };
    const built = buildApiResponse(state, META);
    expect(built.monitors.api.up).toBe(false);
    expect(built.monitors.api.message).toBe('Timeout');
  });

  // The endpoint being replaced threw here, taking the whole response with it.
  it('answers for a monitor with no latency samples instead of failing', () => {
    const state: CompactedState = { ...STATE, latency: {} };
    const built = buildApiResponse(state, META);
    expect(built.monitors.api.latency).toBe(0);
    expect(built.monitors.api.location).toBe('');
  });

  it('passes the overall counts through unchanged, spanning every monitor', () => {
    const built = buildApiResponse(STATE, META);
    expect(built.up).toBe(STATE.overallUp);
    expect(built.down).toBe(STATE.overallDown);
    expect(built.updatedAt).toBe(STATE.lastUpdate);
  });
});
