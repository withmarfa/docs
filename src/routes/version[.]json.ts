import { createFileRoute } from '@tanstack/react-router';

/**
 * What commit the live site is built from.
 *
 * Publishing here is a deploy from a shell rather than a consequence of
 * merging, so "is this change live?" used to be answerable only by reading the
 * published prose and comparing it to the repository. That made a publish that
 * never happened indistinguishable from one that did, and the site sat fifteen
 * merges behind for a day before anyone noticed.
 *
 * The value is baked in at build time, so it describes the bundle actually
 * being served rather than anything the Worker could get wrong at runtime.
 */
export const Route = createFileRoute('/version.json')({
  server: {
    handlers: {
      GET() {
        return new Response(
          JSON.stringify(
            { commit: __BUILD_COMMIT__, built_at: __BUILD_TIME__ },
            null,
            2,
          ),
          {
            headers: {
              'content-type': 'application/json; charset=utf-8',
              // Answering "what is live right now" is the entire job, so this
              // is the one route that must never be served from a cache.
              'cache-control': 'no-store',
            },
          },
        );
      },
    },
  },
});
