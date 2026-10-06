import { describe, expect, it } from 'vitest';
import { describeCause, groupIncidents, joinNames } from './events';
import type { Incident } from './state';

function incident(over: Partial<Incident> = {}): Incident {
  return {
    monitorId: 'alpha',
    monitorName: 'Alpha service',
    start: 1_000_000,
    end: 1_000_060,
    error: 'Expected codes: 2xx, Got: 502',
    durationSeconds: 60,
    ...over,
  };
}

describe('groupIncidents', () => {
  it('collapses two monitors failing on the same tick into one event', () => {
    const events = groupIncidents([
      incident(),
      incident({ monitorId: 'beta', monitorName: 'Beta service', start: 1_000_003 }),
    ]);

    expect(events).toHaveLength(1);
    expect(events[0].monitorNames).toEqual(['Alpha service', 'Beta service']);
  });

  it('keeps separate events separate when they are far enough apart', () => {
    const events = groupIncidents([
      incident(),
      incident({ start: 1_000_600, end: 1_000_660 }),
    ]);

    expect(events).toHaveLength(2);
  });

  it('does not merge simultaneous failures with different causes', () => {
    const events = groupIncidents([
      incident(),
      incident({
        monitorId: 'docs',
        monitorName: 'Documentation',
        start: 1_000_005,
        error: "HTTP response doesn't contain the configured keyword",
      }),
    ]);

    expect(events).toHaveLength(2);
  });

  it('holds the event open while any monitor in it is still down', () => {
    const events = groupIncidents([
      incident(),
      incident({ monitorId: 'beta', monitorName: 'Beta service', start: 1_000_010, end: null }),
    ]);

    expect(events).toHaveLength(1);
    expect(events[0].end).toBeNull();
  });

  it('starts the event at the earliest of its incidents', () => {
    const events = groupIncidents([
      incident({ start: 1_000_030 }),
      incident({ monitorId: 'beta', monitorName: 'Beta service', start: 1_000_000 }),
    ]);

    expect(events[0].start).toBe(1_000_000);
  });

  it('returns nothing for nothing', () => {
    expect(groupIncidents([])).toEqual([]);
  });
});

describe('describeCause', () => {
  it('reads the status code out of the checker phrasing', () => {
    expect(describeCause('Expected codes: 2xx, Got: 502')).toBe('HTTP 502');
    expect(describeCause('Expected codes: 2xx, Got: 404')).toBe('HTTP 404');
  });

  it('names a failed keyword match without mentioning keywords', () => {
    expect(describeCause("HTTP response doesn't contain the configured keyword")).toBe(
      'Unhealthy response',
    );
  });

  it('passes an unrecognized error through rather than swallowing it', () => {
    expect(describeCause('Something entirely new')).toBe('Something entirely new');
  });
});

describe('joinNames', () => {
  it('reads as a sentence at every length', () => {
    expect(joinNames(['Alpha service'])).toBe('Alpha service');
    expect(joinNames(['Alpha service', 'Beta service'])).toBe('Alpha service and Beta service');
    expect(joinNames(['Alpha service', 'Beta service', 'Documentation'])).toBe(
      'Alpha service, Beta service and Documentation',
    );
  });
});
