import { createFileRoute } from '@tanstack/react-router';
import { readStore } from '../lib/store';
import { PUBLIC_MONITORS, buildView, parseMeta, parseState } from '../lib/state';
import { buildAtomFeed, feedEntries } from '../lib/feed';

/**
 * What is true now, and what went wrong before it.
 *
 * Public monitors only. The state entry is always present; incidents join it
 * only when they outlived the checker's grace period, so this and the page
 * deliberately disagree. The page is the full record and it is short; an
 * incident here means something happened that the checker itself would have
 * raised.
 */
export const Route = createFileRoute('/feed.xml')({
  server: {
    handlers: {
      async GET() {
        const raw = await readStore();
        const now = Math.floor(Date.now() / 1000);
        const view = buildView(
          parseState(raw.state),
          parseMeta(raw.meta),
          PUBLIC_MONITORS,
          now,
        );

        return new Response(buildAtomFeed(feedEntries(view, now), now), {
          headers: {
            'content-type': 'application/atom+xml; charset=utf-8',
            'cache-control': 'public, max-age=300',
          },
        });
      },
    },
  },
});
