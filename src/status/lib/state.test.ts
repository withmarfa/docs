import { describe, expect, it } from 'vitest';
import capturedState from './fixtures/captured-state.json';
import {
  HISTORY_WINDOW_SECONDS,
  PUBLIC_MONITORS,
  buildView,
  incidentDuration,
  lastLatency,
  latencyCount,
  latencySeries,
  parseMeta,
  parseState,
} from './state';
import type { CompactedState, PageMeta } from './types';

const CAPTURED = JSON.stringify(capturedState);
/** The moment the fixture was taken, so nothing here depends on the clock. */
const CAPTURED_AT = 1788651670;

const META: PageMeta = {
  title: 'Marfa Status',
  monitors: [
    { id: 'api', name: 'API', statusPageLink: 'https://api.marfa.so/health' },
    { id: 'api-files', name: 'File storage' },
    { id: 'docs', name: 'Documentation' },
  ],
  maintenances: [],
};

/** Hex-pack a latency series the way the checker does: LE Uint32, LE Uint16. */
function packLatency(samples: { time: number; ping: number; loc: string }[]) {
  const hex = (bytes: Uint8Array) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  const loc: { v: string[]; c: number[] } = { v: [], c: [] };
  for (const sample of samples) {
    if (loc.v[loc.v.length - 1] !== sample.loc) {
      loc.v.push(sample.loc);
      loc.c.push(1);
    } else {
      loc.c[loc.c.length - 1] += 1;
    }
  }
  return {
    time: samples
      .map((s) => hex(new Uint8Array(new Uint32Array([s.time]).buffer)))
      .join(''),
    ping: samples
      .map((s) => hex(new Uint8Array(new Uint16Array([s.ping]).buffer)))
      .join(''),
    loc,
  };
}

function syntheticState(over: Partial<CompactedState> = {}): CompactedState {
  return {
    lastUpdate: CAPTURED_AT,
    overallUp: 3,
    overallDown: 0,
    incident: {},
    latency: {},
    ...over,
  };
}

describe('parsing what the checker wrote', () => {
  it('decodes a captured real blob', () => {
    const state = parseState(CAPTURED);
    expect(state.lastUpdate).toBe(CAPTURED_AT);
    expect(Object.keys(state.incident).sort()).toEqual([
      'api',
      'api-files',
      'docs',
      'staging',
      'staging-files',
    ]);
  });

  it('reads the packed latency series back, twelve hours of it', () => {
    const state = parseState(CAPTURED);
    expect(latencyCount(state, 'api')).toBe(242);

    const series = latencySeries(state, 'api');
    expect(series).toHaveLength(242);
    // Times are seconds and ascending; the span is the retention window.
    const span = series[series.length - 1].time - series[0].time;
    expect(span).toBeGreaterThan(11 * 60 * 60);
    expect(span).toBeLessThanOrEqual(12 * 60 * 60);
    expect(series.every((s) => s.ping >= 0 && s.ping < 65536)).toBe(true);
    expect(series.every((s) => s.loc.length > 0)).toBe(true);
  });

  it('agrees with the indexed accessor on the last sample', () => {
    const state = parseState(CAPTURED);
    const series = latencySeries(state, 'docs');
    expect(lastLatency(state, 'docs')).toEqual(series[series.length - 1]);
  });

  // A store that is empty, truncated or from a shape this reader does not know
  // has to render as "no data". An outage is when this page is read, and it is
  // also when the store is most likely to be odd.
  it.each([
    ['nothing stored', null],
    ['not JSON', '{{'],
    ['JSON of the wrong shape', '{"lastUpdate":7}'],
  ])('never throws on %s', (_label, raw) => {
    expect(() => parseState(raw)).not.toThrow();
  });

  it('reports an unusable store as empty rather than as healthy', () => {
    expect(parseState(null).lastUpdate).toBe(0);
    expect(buildView(parseState(null), null, PUBLIC_MONITORS, CAPTURED_AT).empty).toBe(true);
  });

  it('refuses metadata that carries no monitors', () => {
    expect(parseMeta(null)).toBeNull();
    expect(parseMeta('{}')).toBeNull();
    expect(parseMeta(JSON.stringify(META))?.monitors).toHaveLength(3);
  });
});

describe('what counts as down', () => {
  it('treats an unclosed incident as the current outage', () => {
    const state = syntheticState({
      incident: {
        api: {
          start: [[CAPTURED_AT - HISTORY_WINDOW_SECONDS], [CAPTURED_AT - 300]],
          end: [CAPTURED_AT - HISTORY_WINDOW_SECONDS, null],
          error: [['dummy'], ['Expected codes: 2xx, Got: 502']],
        },
      },
    });
    const view = buildView(state, META, ['api'], CAPTURED_AT);
    expect(view.monitors[0].up).toBe(false);
    expect(view.monitors[0].downSince).toBe(CAPTURED_AT - 300);
    expect(view.monitors[0].error).toBe('Expected codes: 2xx, Got: 502');
    expect(view.allUp).toBe(false);
    expect(view.downCount).toBe(1);
  });

  // The checker re-seeds this placeholder on every tick, so it is not a
  // one-off that could be tolerated in the history.
  it('keeps the re-seeded placeholder out of the history without reading it as an outage', () => {
    const state = syntheticState({
      incident: {
        api: {
          start: [[CAPTURED_AT - HISTORY_WINDOW_SECONDS]],
          end: [CAPTURED_AT - HISTORY_WINDOW_SECONDS],
          error: [['dummy']],
        },
      },
    });
    const view = buildView(state, META, ['api'], CAPTURED_AT);
    expect(view.incidents).toEqual([]);
    expect(view.monitors[0].up).toBe(true);
    expect(view.monitors[0].uptime).toBe(1);
  });

  // `start` grows when the error text changes inside one open incident, which
  // reads like a second outage and is not.
  it('dates a multi-start incident from its first start and reports its last error', () => {
    const incident = {
      start: [CAPTURED_AT - 600, CAPTURED_AT - 300],
      end: null,
      error: ['Expected codes: 2xx, Got: 502', 'Timeout'],
    };
    expect(incidentDuration(incident, CAPTURED_AT)).toBe(600);

    const state = syntheticState({
      incident: {
        api: { start: [incident.start], end: [null], error: [incident.error] },
      },
    });
    const view = buildView(state, META, ['api'], CAPTURED_AT);
    expect(view.monitors[0].downSince).toBe(CAPTURED_AT - 600);
    expect(view.monitors[0].error).toBe('Timeout');
    expect(view.incidents[0].durationSeconds).toBe(600);
  });

  // The upstream accessor slices unguarded and throws here, which is a 500 on
  // the whole page rather than one row without a number.
  it('renders a monitor that has no latency samples yet', () => {
    const state = syntheticState({ latency: {} });
    expect(latencyCount(state, 'api')).toBe(0);
    expect(lastLatency(state, 'api')).toBeNull();

    const view = buildView(state, META, ['api'], CAPTURED_AT);
    expect(view.monitors[0].latencyMs).toBeNull();
    expect(view.monitors[0].up).toBe(true);
  });

  it('falls back to the id when the metadata does not name a monitor', () => {
    const view = buildView(syntheticState(), META, ['newly-added'], CAPTURED_AT);
    expect(view.monitors[0].name).toBe('newly-added');
  });
});

describe('uptime over the retention window', () => {
  it('subtracts a closed outage from the window', () => {
    const oneHour = 60 * 60;
    const state = syntheticState({
      incident: {
        api: {
          start: [[CAPTURED_AT - 2 * oneHour]],
          end: [CAPTURED_AT - oneHour],
          error: [['Expected codes: 2xx, Got: 502']],
        },
      },
    });
    const view = buildView(state, META, ['api'], CAPTURED_AT);
    expect(view.monitors[0].uptime).toBeCloseTo(1 - oneHour / HISTORY_WINDOW_SECONDS, 10);
  });

  it('counts an open outage up to now', () => {
    const state = syntheticState({
      incident: {
        api: {
          start: [[CAPTURED_AT - 3600]],
          end: [null],
          error: [['down']],
        },
      },
    });
    const view = buildView(state, META, ['api'], CAPTURED_AT);
    expect(view.monitors[0].uptime).toBeCloseTo(1 - 3600 / HISTORY_WINDOW_SECONDS, 10);
  });

  it('clips an outage that began before the window opened', () => {
    const state = syntheticState({
      incident: {
        api: {
          start: [[CAPTURED_AT - HISTORY_WINDOW_SECONDS * 2]],
          end: [CAPTURED_AT - HISTORY_WINDOW_SECONDS + 3600],
          error: [['down']],
        },
      },
    });
    const view = buildView(state, META, ['api'], CAPTURED_AT);
    expect(view.monitors[0].uptime).toBeCloseTo(1 - 3600 / HISTORY_WINDOW_SECONDS, 10);
  });
});

describe('the public set', () => {
  it('renders production and documentation, and not staging', () => {
    expect([...PUBLIC_MONITORS]).toEqual(['api', 'api-files', 'docs']);
  });

  it('reports on the rendered monitors rather than on every monitor checked', () => {
    // Staging down, production up. The banner must not say anything is wrong:
    // the overall counts in the store span all five, which is why they are not
    // what the banner is built from.
    const state = parseState(CAPTURED);
    state.incident.staging.end[state.incident.staging.end.length - 1] = null;
    state.overallDown = 1;
    state.overallUp = 4;

    const view = buildView(state, META, PUBLIC_MONITORS, CAPTURED_AT);
    expect(view.monitors.map((m) => m.id)).toEqual(['api', 'api-files', 'docs']);
    expect(view.allUp).toBe(true);
    expect(view.downCount).toBe(0);
  });

  it('builds the fixture into three named, healthy rows', () => {
    const view = buildView(parseState(CAPTURED), META, PUBLIC_MONITORS, CAPTURED_AT);
    expect(view.monitors.map((m) => m.name)).toEqual([
      'API',
      'File storage',
      'Documentation',
    ]);
    expect(view.allUp).toBe(true);
    expect(view.lastUpdate).toBe(CAPTURED_AT);
    expect(view.empty).toBe(false);
    expect(view.monitors.every((m) => m.latencyMs !== null)).toBe(true);
  });

  it('packs and unpacks a latency series symmetrically', () => {
    const samples = [
      { time: CAPTURED_AT - 360, ping: 41, loc: 'LHR' },
      { time: CAPTURED_AT - 180, ping: 39, loc: 'LHR' },
      { time: CAPTURED_AT, ping: 1200, loc: 'CDG' },
    ];
    const state = syntheticState({ latency: { api: packLatency(samples) } });
    expect(latencySeries(state, 'api')).toEqual(samples);
  });
});
