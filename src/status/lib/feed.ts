import type { Incident, StatusView } from './state';
import { SITE_URL } from './api';
import { formatAbsolute, formatDuration } from './format';
import { describeCause, groupIncidents, joinNames } from './events';

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
 * Deliberately not "an incident". Two sources feed it already — the checker's
 * incident records and the current overall state — and a hand-written
 * maintenance notice is the obvious third, so the entry shape knows nothing
 * about where it came from.
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
 * history it returns nothing, which is the correct answer rather than a bug —
 * `currentStatusEntry` is what keeps the document itself from being empty.
 *
 * **Grouped, for the same reason the page groups.** Two monitors watch one
 * URL, so an unfiltered feed announced every outage twice, seconds apart, with
 * two subject lines naming halves of one event. A subscriber cannot tell those
 * apart from two things going wrong.
 */
export function incidentsToEntries(incidents: Incident[], now: number): FeedEntry[] {
  return groupIncidents(incidents)
    .filter((event) => (event.end ?? now) - event.start >= FEED_THRESHOLD_SECONDS)
    .map((event) => {
      const resolved = event.end !== null;
      const names = joinNames(event.monitorNames);
      const plural = event.monitorNames.length > 1;
      return {
        // The ids are sorted so that the order the checker happened to walk its
        // monitors in cannot change an entry's identity between two polls, which
        // a reader would see as the same outage arriving twice.
        id: `tag:marfa.so,2026:status/${[...event.monitorIds].sort().join('+')}/${event.start}`,
        title: resolved
          ? `${names} recovered`
          : `${names} ${plural ? 'are' : 'is'} unavailable`,
        published: event.start,
        updated: event.end ?? now,
        summary: resolved
          ? `${names} ${plural ? 'were' : 'was'} unavailable for ${formatDuration(
              event.durationSeconds,
            )}. ${describeCause(event.error)}.`
          : `${names} ${plural ? 'have' : 'has'} been unavailable for ${formatDuration(
              event.durationSeconds,
            )}. ${describeCause(event.error)}.`,
      };
    });
}

/**
 * When the current run of good or bad news began.
 *
 * Null only when the store has nothing in it at all, which is the one case
 * where there is no state to report rather than a quiet one.
 */
function stateChangedAt(view: StatusView): number | null {
  if (view.empty) return null;

  const open = view.incidents.filter((incident) => incident.end === null);
  if (open.length > 0) return Math.min(...open.map((incident) => incident.start));

  const ended = view.incidents
    .map((incident) => incident.end)
    .filter((end): end is number => end !== null);
  if (ended.length > 0) return Math.max(...ended);

  // Nothing has ever gone wrong here, so the run began when watching did.
  return view.since ?? view.lastUpdate;
}

/**
 * What is true right now, as an entry.
 *
 * Without this the feed was empty for as long as nothing went wrong, which is
 * most of the time and is also the answer a reader most wants: a subscribe
 * link that leads to a document with nothing in it looks broken rather than
 * calm.
 *
 * **The id is the moment the state last changed, and `updated` is that moment
 * too.** Not `now`. A feed reader treats a moved `updated` as news, so
 * stamping the current time would announce "all systems operational" on every
 * poll, forever. Keyed this way the entry is silent while the state holds and
 * arrives exactly once when it flips, in either direction — which is the only
 * behavior that makes an always-present entry worth carrying.
 */
export function currentStatusEntry(view: StatusView): FeedEntry | null {
  const changedAt = stateChangedAt(view);
  if (changedAt === null) return null;

  const total = view.monitors.length;
  const down = view.monitors.filter((monitor) => !monitor.up);
  const since = formatAbsolute(changedAt);

  return {
    id: `tag:marfa.so,2026:status/state/${changedAt}`,
    title: view.allUp
      ? 'All systems operational'
      : `${down.length} of ${total} systems down`,
    published: changedAt,
    updated: changedAt,
    summary: view.allUp
      ? `All ${total} systems have been responding normally since ${since}.`
      : `${down.map((monitor) => monitor.name).join(', ')} ${
          down.length === 1 ? 'is' : 'are'
        } not responding, since ${since}.`,
  };
}

/**
 * Everything the feed carries, newest first.
 *
 * The state entry sorts ahead of an incident that opened in the same second,
 * because the sort is stable and it goes in first. That tie is the common case
 * rather than a corner: a single outage both opens an incident and changes the
 * overall state, and the summary belongs above the detail.
 */
export function feedEntries(view: StatusView, now: number): FeedEntry[] {
  const current = currentStatusEntry(view);
  const entries = current ? [current] : [];
  entries.push(...incidentsToEntries(view.incidents, now));
  return entries.sort((a, b) => b.published - a.published);
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
  <title>Marfa Status</title>
  <subtitle>Current status and incidents for the Marfa API, file storage and documentation.</subtitle>
  <id>tag:marfa.so,2026:status</id>
  <link href="${SITE_URL}/"/>
  <link rel="self" href="${SITE_URL}/feed.xml"/>
  <updated>${iso(updated)}</updated>
${items}${items ? '\n' : ''}</feed>
`;
}
