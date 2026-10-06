import { describe, expect, it } from 'vitest';
import capturedState from './fixtures/captured-state.json';
import {
  HISTORY_WINDOW_SECONDS,
  PUBLIC_MONITORS,
  UPTIME_BAR_DAYS,
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

/** Observed for the whole retention window, so uptime spans all of it. */
const FULLY_OBSERVED = CAPTURED_AT - 90 * 24 * 60 * 60;

// The labels as the checker last wrote them. The captured store still holds
// state and labels for monitors that are no longer configured, which is what
// the public-set tests below rely on: the page has to leave them out because
// of its own list, not because the store stopped carrying them.
const META: PageMeta = {
  title: 'Marfa Status',
  since: FULLY_OBSERVED,
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

  // Only `since` is normalized on a monitor, because only `since` is
  // arithmetic: it propagates into every day cell and the uptime denominator,
  // where `undefined` already means "cannot vouch for it".
  it.each([
    ['a string', '"2026-01-01"'],
    ['zero', '0'],
    ['null', 'null'],
    ['missing', undefined],
  ])('drops a monitor observation start that is %s', (_label, raw) => {
    const monitor = raw === undefined ? '{"id":"api","name":"API"}' : `{"id":"api","name":"API","since":${raw}}`;
    const meta = parseMeta(`{"monitors":[${monitor}],"since":1}`);
    expect(meta?.monitors[0].since).toBeUndefined();
  });

  it('keeps a usable monitor observation start', () => {
    const meta = parseMeta('{"monitors":[{"id":"api","name":"API","since":1788000000}],"since":1}');
    expect(meta?.monitors[0].since).toBe(1788000000);
  });
});

// The failure this exists to stop: the deployment-wide start is one number for
// the whole store, so a monitor added later inherits it and gets ninety days of
// green for days it did not exist.
describe('when each monitor started being watched', () => {
  const DAY = 24 * 60 * 60;

  function viewFor(since: number | undefined) {
    return buildView(
      syntheticState(),
      {
        ...META,
        monitors: META.monitors.map((monitor) =>
          monitor.id === 'api' ? { ...monitor, since } : monitor,
        ),
      },
      ['api'],
      CAPTURED_AT,
    );
  }

  it('uses the monitor\'s own start over the deployment\'s', () => {
    const view = viewFor(CAPTURED_AT - 3 * DAY);
    expect(view.monitors[0].observedDays).toBe(3);
    expect(view.monitors[0].days.filter((day) => day.status === 'unknown')).toHaveLength(
      UPTIME_BAR_DAYS - 4,
    );
  });

  it('falls back to the deployment for a monitor that carries none', () => {
    expect(viewFor(undefined).monitors[0].observedDays).toBe(UPTIME_BAR_DAYS);
  });

  // A monitor added an hour ago has nothing to show, and grey is the honest
  // answer. A confident 100% over ninety days would be the worst one.
  it('greys out a monitor added minutes ago rather than claiming uptime', () => {
    const view = viewFor(CAPTURED_AT - 600);
    expect(view.monitors[0].days.filter((day) => day.status === 'up')).toHaveLength(1);
    expect(view.monitors[0].uptime).toBe(1);
    expect(view.monitors[0].observedDays).toBe(1);
  });

  // The document-level value is a statement about the store, and the feed
  // dates "nothing has ever gone wrong here" from it. One monitor's start must
  // not move it.
  it('leaves the view\'s own start as the deployment\'s', () => {
    expect(viewFor(CAPTURED_AT - 3 * DAY).since).toBe(META.since);
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

  // A confident 100% is the worst possible answer when nothing was watched.
  it('gives no uptime figure at all when the store cannot say when it started', () => {
    const view = buildView(syntheticState(), { ...META, since: undefined }, ['api'], CAPTURED_AT);
    expect(view.monitors[0].uptime).toBeNull();
    expect(view.monitors[0].observedDays).toBe(0);
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

describe('uptime over the window that was watched', () => {
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

  // The denominator is what was watched, not what is retained. Dividing by
  // ninety days when a week was watched produces a figure that disagrees with
  // the bar printed beside it.
  it('divides by the observed window, not the retention window', () => {
    const week = 7 * 24 * 60 * 60;
    const state = syntheticState({
      incident: {
        api: {
          start: [[CAPTURED_AT - 3600]],
          end: [CAPTURED_AT],
          error: [['down']],
        },
      },
    });
    const view = buildView(state, { ...META, since: CAPTURED_AT - week }, ['api'], CAPTURED_AT);
    expect(view.monitors[0].uptime).toBeCloseTo(1 - 3600 / week, 10);
    expect(view.monitors[0].observedDays).toBe(7);
  });

  it('never claims more observed days than the bar can show', () => {
    const view = buildView(
      syntheticState(),
      { ...META, since: CAPTURED_AT - 400 * 24 * 60 * 60 },
      ['api'],
      CAPTURED_AT,
    );
    expect(view.monitors[0].observedDays).toBe(UPTIME_BAR_DAYS);
  });
});

describe('the uptime bar', () => {
  const DAY = 24 * 60 * 60;
  // Midday, so a day boundary is never the same instant as `now`.
  const NOON = Math.floor(CAPTURED_AT / DAY) * DAY + 12 * 3600;

  function withIncident(over: Partial<{ start: number; end: number | null }> = {}) {
    const start = over.start ?? NOON - 3600;
    const end = over.end === undefined ? NOON - 1800 : over.end;
    return syntheticState({
      incident: {
        api: { start: [[start]], end: [end], error: [['down']] },
      },
    });
  }

  function cells(state: CompactedState, since: number | undefined) {
    return buildView(state, { ...META, since }, ['api'], NOON).monitors[0].days;
  }

  it('draws one cell per retained day, oldest first', () => {
    const days = cells(syntheticState(), NOON - 400 * DAY);
    expect(days).toHaveLength(UPTIME_BAR_DAYS);
    expect(days[days.length - 1].start).toBeGreaterThan(days[0].start);
    expect(days[days.length - 1].start).toBe(Math.floor(NOON / DAY) * DAY);
  });

  // The whole reason the checker records when it started. A bar that paints
  // unwatched days green is a claim about days nobody watched.
  it('greys out every day before the checker was watching', () => {
    const since = NOON - 3 * DAY;
    const days = cells(syntheticState(), since);
    const unknown = days.filter((d) => d.status === 'unknown');
    // Today plus the three full days the checker can account for.
    expect(days.length - unknown.length).toBe(4);
    expect(days.slice(0, unknown.length).every((d) => d.status === 'unknown')).toBe(true);
  });

  it('greys out everything when the store cannot say when it started', () => {
    expect(cells(syntheticState(), undefined).every((d) => d.status === 'unknown')).toBe(true);
  });

  it('marks a day with no incident as up', () => {
    const days = cells(syntheticState(), NOON - 10 * DAY);
    expect(days[days.length - 1].status).toBe('up');
    expect(days[days.length - 1].downSeconds).toBe(0);
  });

  it('marks a brief outage as degraded rather than out', () => {
    const days = cells(withIncident(), NOON - 10 * DAY);
    const today = days[days.length - 1];
    expect(today.status).toBe('partial');
    expect(today.downSeconds).toBe(1800);
  });

  it('marks a day mostly spent down as down', () => {
    const days = cells(
      withIncident({ start: NOON - 11 * 3600, end: NOON - 3600 }),
      NOON - 10 * DAY,
    );
    expect(days[days.length - 1].status).toBe('down');
  });

  it('measures an open incident up to now, not to the end of the day', () => {
    const days = cells(withIncident({ start: NOON - 1800, end: null }), NOON - 10 * DAY);
    const today = days[days.length - 1];
    expect(today.downSeconds).toBe(1800);
    // Today is half over, so its observed window is midnight to noon.
    expect(today.observedSeconds).toBe(12 * 3600);
  });

  // The first observed day is partial, so its denominator has to start at
  // `since` rather than at midnight, or a short outage reads as a long one.
  it('counts the first observed day only from the moment watching began', () => {
    const since = NOON - 6 * 3600;
    const days = cells(syntheticState(), since);
    expect(days[days.length - 1].observedSeconds).toBe(6 * 3600);
  });

  it('confines an outage to the days it actually spans', () => {
    const days = cells(
      withIncident({ start: NOON - 30 * DAY, end: NOON - 30 * DAY + 600 }),
      NOON - 60 * DAY,
    );
    const affected = days.filter((d) => d.downSeconds > 0);
    expect(affected).toHaveLength(1);
    expect(affected[0].status).toBe('partial');
  });
});

describe('the public set', () => {
  it('renders the documentation monitor alone', () => {
    expect([...PUBLIC_MONITORS]).toEqual(['docs']);
  });

  it('reports on the rendered monitors rather than on everything the store holds', () => {
    // A stored monitor that is no longer configured, still down. The banner
    // must not say anything is wrong: the overall counts in the store span
    // every monitor it holds, which is why they are not what the banner is
    // built from.
    const state = parseState(CAPTURED);
    state.incident.api.end[state.incident.api.end.length - 1] = null;
    state.overallDown = 1;
    state.overallUp = 4;

    const view = buildView(state, META, PUBLIC_MONITORS, CAPTURED_AT);
    expect(view.monitors.map((m) => m.id)).toEqual(['docs']);
    expect(view.incidents.every((incident) => incident.monitorId === 'docs')).toBe(true);
    expect(view.allUp).toBe(true);
    expect(view.downCount).toBe(0);
  });

  it('draws no group heading for a group whose monitors are not rendered', () => {
    const meta: PageMeta = {
      ...META,
      group: { Retired: ['api', 'api-files'], Documentation: ['docs'] },
    };
    const view = buildView(parseState(CAPTURED), meta, PUBLIC_MONITORS, CAPTURED_AT);
    expect(view.groups.map((group) => group.label)).toEqual(['Documentation']);
  });

  it('builds the fixture into one named, healthy row', () => {
    const view = buildView(parseState(CAPTURED), META, PUBLIC_MONITORS, CAPTURED_AT);
    expect(view.monitors.map((m) => m.name)).toEqual(['Documentation']);
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
