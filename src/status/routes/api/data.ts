import { createFileRoute } from '@tanstack/react-router';
import { readStore } from '../../lib/store';
import { parseMeta, parseState } from '../../lib/state';
import { API_HEADERS, buildApiResponse } from '../../lib/api';

/**
 * The machine-readable record, at the path and shape it already had.
 *
 * Kept identical through the hosting move on purpose: this is the only
 * published contract the status page has, and changing it at the same moment
 * as the move would make two failures look like one.
 */
export const Route = createFileRoute('/api/data')({
  server: {
    handlers: {
      async GET() {
        const raw = await readStore();
        const state = parseState(raw.state);

        if (state.lastUpdate === 0) {
          return new Response(JSON.stringify({ error: 'No data available' }), {
            status: 500,
            headers: API_HEADERS,
          });
        }

        return new Response(
          JSON.stringify(buildApiResponse(state, parseMeta(raw.meta))),
          { headers: API_HEADERS },
        );
      },
      OPTIONS() {
        return new Response(null, { status: 204, headers: API_HEADERS });
      },
    },
  },
});
