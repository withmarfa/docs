import type { Incident } from './state';
import { SITE_URL } from './api';
import { formatDuration } from './format';

/**
 * The grace period, in seconds, as the checker actually applies it.
 *
 * Its configuration says three minutes, and its arithmetic does not: the test
 * is `now - start >= gracePeriod * 60 - 30`, and the recovery notification
 * uses `(gracePeriod + 1) * 60 - 30` again. A feed thresholded at a round 180
 * would publish incidents the checker stayed silent about and drop ones it
 * announced, which is the one way a feed like this can be actively misleading.
 *
 * Derived here rather than written as 150, so the two move together if the
 * configured period ever changes.
 */
export const GRACE_PERIOD_MINUTES = 3;
export const FEED_THRESHOLD_SECONDS = GRACE_PERIOD_MINUTES * 60 - 30;

/**
 * One item in the feed.
 *
 * Deliberately not "an incident". Everything published here is currently
 * derived from the checker's records, but a hand-written maintenance notice is
 * the obvious next source and should join the same feed rather than a second
 * one, so the entry shape knows nothing about where it came from.
 */
export type FeedEntry = {
  id: string;
  title: string;
  published: number;
  updated: number;
  summary: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function iso(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString();
}

/**
 * Incidents worth telling someone about.
 *
 * Only those that outlived the grace period, because that is the line the
 * checker itself draws before it raises anything, and a feed that disagreed
 * with the notifier would be a second, quieter definition of "an outage".
 *
 * The page and this deliberately disagree: the page is the full record and it
 * is short, and this only speaks when it matters. Against the real ninety-day
 * history it is empty, which is the correct answer rather than a bug.
 */
export function incidentsToEntries(incidents: Incident[], now: number): FeedEntry[] {
  return incidents
    .filter((incident) => {
      const end = incident.end ?? now;
      return end - incident.start >= FEED_THRESHOLD_SECONDS;
    })
    .map((incident) => {
      const resolved = incident.end !== null;
      return {
        id: `tag:marfa.so,2026:status/${incident.monitorId}/${incident.start}`,
        title: resolved
          ? `${incident.monitorName} recovered`
          : `${incident.monitorName} is unavailable`,
        published: incident.start,
        updated: incident.end ?? now,
        summary: resolved
          ? `${incident.monitorName} was unavailable for ${formatDuration(
              incident.durationSeconds,
            )}. ${incident.error}`
          : `${incident.monitorName} has been unavailable for ${formatDuration(
              incident.durationSeconds,
            )}. ${incident.error}`,
      };
    });
}

/**
 * Atom, hand-rolled.
 *
 * A dozen worktrees merge through this lockfile at a time, and a dependency
 * added to emit forty lines of XML conflicts with every one of them.
 */
export function buildAtomFeed(entries: FeedEntry[], now: number): string {
  const updated = entries.length > 0 ? Math.max(...entries.map((e) => e.updated)) : now;

  const items = entries
    .map(
      (entry) => `  <entry>
    <title>${escapeXml(entry.title)}</title>
    <id>${escapeXml(entry.id)}</id>
    <link href="${SITE_URL}/"/>
    <published>${iso(entry.published)}</published>
    <updated>${iso(entry.updated)}</updated>
    <summary type="text">${escapeXml(entry.summary)}</summary>
  </entry>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Marfa status</title>
  <subtitle>Incidents affecting the Marfa API, file storage and documentation.</subtitle>
  <id>tag:marfa.so,2026:status</id>
  <link href="${SITE_URL}/"/>
  <link rel="self" href="${SITE_URL}/feed.xml"/>
  <updated>${iso(updated)}</updated>
${items}${items ? '\n' : ''}</feed>
`;
}
