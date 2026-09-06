import { describe, expect, it } from 'vitest';
import { FEED_THRESHOLD_SECONDS, buildAtomFeed, incidentsToEntries } from './feed';
import type { Incident } from './state';

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

  // Every public incident in the real ninety-day history is one of these, which
  // is why the feed is empty and should stay that way.
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
