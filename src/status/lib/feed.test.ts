import { describe, expect, it } from 'vitest';
import {
  FEED_THRESHOLD_SECONDS,
  buildAtomFeed,
  currentStatusEntry,
  feedEntries,
  incidentsToEntries,
} from './feed';
import type { Incident, MonitorView, StatusView } from './state';

const NOW = 1_788_652_000;

function incident(over: Partial<Incident> = {}): Incident {
  return {
    monitorId: 'api',
    monitorName: 'API',
    start: NOW - 600,
    end: NOW - 300,
    error: 'Expected codes: 2xx, Got: 502',
    durationSeconds: 300,
    ...over,
  };
}

function monitor(over: Partial<MonitorView> = {}): MonitorView {
  return {
    id: 'api',
    name: 'API',
    up: true,
    downSince: null,
    error: null,
    latencyMs: 40,
    location: 'LHR',
    uptime: 1,
    observedDays: 5,
    series: [],
    seriesSeconds: 0,
    days: [],
    ...over,
  };
}

function view(over: Partial<StatusView> = {}): StatusView {
  const monitors = over.monitors ?? [monitor(), monitor({ id: 'docs', name: 'Docs' })];
  const downCount = monitors.filter((m) => !m.up).length;
  return {
    lastUpdate: NOW,
    monitors,
    groups: [],
    incidents: [],
    allUp: downCount === 0,
    since: NOW - 5 * 86_400,
    downCount,
    empty: false,
    ...over,
  };
}

describe('what reaches the feed', () => {
  // The checker's configuration says three minutes and its arithmetic says
  // 150 seconds. A feed at the round number would publish incidents it stayed
  // silent about and drop ones it announced.
  it('uses the threshold the checker actually applies, not the configured one', () => {
    expect(FEED_THRESHOLD_SECONDS).toBe(150);
  });

  it('publishes an incident that outlived the grace period, once resolved', () => {
    const entries = incidentsToEntries([incident()], NOW);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('API recovered');
    expect(entries[0].summary).toContain('5 minutes');
    expect(entries[0].published).toBe(NOW - 600);
    expect(entries[0].updated).toBe(NOW - 300);
  });

  it('publishes an incident that is still open', () => {
    const entries = incidentsToEntries(
      [incident({ end: null, start: NOW - 600, durationSeconds: 600 })],
      NOW,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('API is unavailable');
    expect(entries[0].updated).toBe(NOW);
  });

  // Every public incident in the real ninety-day history is one of these, so
  // this filter is why no incident has ever been published. The state entry is
  // what keeps the document itself from being empty.
  it('says nothing about a single failed check', () => {
    const entries = incidentsToEntries(
      [incident({ start: NOW - 60, end: NOW, durationSeconds: 60 })],
      NOW,
    );
    expect(entries).toEqual([]);
  });

  it.each([
    [FEED_THRESHOLD_SECONDS - 1, 0],
    [FEED_THRESHOLD_SECONDS, 1],
  ])('an outage of %i seconds yields %i entries', (duration, expected) => {
    const entries = incidentsToEntries(
      [incident({ start: NOW - duration, end: NOW, durationSeconds: duration })],
      NOW,
    );
    expect(entries).toHaveLength(expected);
  });

  it('measures an open incident against now rather than against its end', () => {
    const entries = incidentsToEntries(
      [incident({ start: NOW - FEED_THRESHOLD_SECONDS, end: null })],
      NOW,
    );
    expect(entries).toHaveLength(1);
  });

  it('gives an incident a stable id, so a reader does not see it twice', () => {
    const first = incidentsToEntries([incident({ end: null })], NOW);
    const later = incidentsToEntries([incident({ end: NOW })], NOW + 5000);
    expect(first[0].id).toBe(later[0].id);
    expect(first[0].title).not.toBe(later[0].title);
  });
});

describe('the Atom document', () => {
  it('is well-formed and self-describing when empty', () => {
    const xml = buildAtomFeed([], NOW);
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(xml).toContain('<id>tag:marfa.so,2026:status</id>');
    expect(xml).toContain('rel="self"');
    expect(xml).not.toContain('<entry>');
    expect(xml.trimEnd().endsWith('</feed>')).toBe(true);
  });

  it('carries one entry per published incident', () => {
    const xml = buildAtomFeed(incidentsToEntries([incident()], NOW), NOW);
    expect(xml.match(/<entry>/g)).toHaveLength(1);
    expect(xml).toContain('<title>API recovered</title>');
  });

  // Error text comes from an upstream response and lands inside an element.
  it('escapes markup that arrives in an error message', () => {
    const xml = buildAtomFeed(
      incidentsToEntries([incident({ error: '<script>&"bad"</script>' })], NOW),
      NOW,
    );
    expect(xml).not.toContain('<script>');
    expect(xml).toContain('&lt;script&gt;&amp;&quot;bad&quot;&lt;/script&gt;');
  });

  it('stamps the document with the most recent entry it carries', () => {
    const xml = buildAtomFeed(incidentsToEntries([incident()], NOW), NOW);
    expect(xml).toContain(`<updated>${new Date((NOW - 300) * 1000).toISOString()}</updated>`);
  });
});
describe('the state of things, as an entry', () => {
  it('says all is well when nothing is open, dated from when watching began', () => {
    const entry = currentStatusEntry(view());
    expect(entry?.title).toBe('All systems operational');
    expect(entry?.published).toBe(NOW - 5 * 86_400);
    expect(entry?.summary).toContain('All 2 systems');
  });

  it('names what is down, and how many', () => {
    const entry = currentStatusEntry(
      view({
        monitors: [monitor({ up: false, downSince: NOW - 400 }), monitor({ id: 'docs', name: 'Docs' })],
        incidents: [incident({ end: null, start: NOW - 400 })],
      }),
    );
    expect(entry?.title).toBe('1 of 2 systems down');
    expect(entry?.summary).toContain('API is not responding');
    expect(entry?.published).toBe(NOW - 400);
  });

  // The whole reason the entry is keyed on the change rather than on the poll.
  // A moved `updated` is news to a reader, so stamping `now` would announce
  // "all systems operational" every five minutes for the rest of time.
  it('holds its id and its timestamp still while the state does', () => {
    const settled = view({ incidents: [incident({ end: NOW - 300 })] });
    const first = currentStatusEntry(settled);
    const later = currentStatusEntry(settled);
    expect(first?.id).toBe(later?.id);
    expect(first?.updated).toBe(NOW - 300);
    expect(first?.updated).not.toBe(NOW);
  });

  it('gives a different id once the state flips, so the change is delivered', () => {
    const calm = currentStatusEntry(view({ incidents: [incident({ end: NOW - 300 })] }));
    const broken = currentStatusEntry(
      view({
        monitors: [monitor({ up: false }), monitor({ id: 'docs', name: 'Docs' })],
        incidents: [incident({ end: null, start: NOW - 100 })],
      }),
    );
    expect(calm?.id).not.toBe(broken?.id);
  });

  it('has nothing to say when the store is empty', () => {
    expect(currentStatusEntry(view({ empty: true, lastUpdate: 0 }))).toBeNull();
  });
});

describe('the document a subscriber actually receives', () => {
  // The complaint this answers: the feed was well-formed, valid and completely
  // empty, because no public incident has ever outlived the grace period.
  it('is never empty while the checker is running', () => {
    const xml = buildAtomFeed(feedEntries(view(), NOW), NOW);
    expect(xml.match(/<entry>/g)).toHaveLength(1);
    expect(xml).toContain('<title>All systems operational</title>');
  });

  it('puts the state above the incident that caused it', () => {
    const entries = feedEntries(
      view({
        monitors: [monitor({ up: false }), monitor({ id: 'docs', name: 'Docs' })],
        incidents: [incident({ end: null, start: NOW - 600 })],
      }),
      NOW,
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].title).toBe('1 of 2 systems down');
    expect(entries[1].title).toBe('API is unavailable');
  });

  it('still drops a blip too short for the checker to have raised it', () => {
    const entries = feedEntries(
      view({ incidents: [incident({ start: NOW - 60, end: NOW, durationSeconds: 60 })] }),
      NOW,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('All systems operational');
  });

  it('carries nothing at all when the store is empty', () => {
    expect(feedEntries(view({ empty: true, lastUpdate: 0 }), NOW)).toEqual([]);
  });
});
