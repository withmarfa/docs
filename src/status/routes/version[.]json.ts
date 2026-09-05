import { createFileRoute } from '@tanstack/react-router';

/**
 * What commit this Worker is built from.
 *
 * The twin of the docs site's endpoint, and it exists for the same reason: the
 * publish workflow proves a deploy landed by fetching this and comparing the
 * commit it names. Two Workers publish independently, so each needs its own
 * proof; without this one, the status page could silently stop publishing and
 * the check watching for exactly that would be looking at the other site.
 */
export const Route = createFileRoute('/version.json')({
  server: {
    handlers: {
      GET() {
        return new Response(
          JSON.stringify({ commit: __BUILD_COMMIT__, built_at: __BUILD_TIME__ }, null, 2),
          {
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
            },
          },
        );
      },
    },
  },
});
