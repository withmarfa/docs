import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { env, waitUntil } from 'cloudflare:workers';
import { createWorkerHandler } from '@/lib/worker';

// The Worker's one entry. The stages it runs are in `src/lib/worker.ts`.
export default createServerEntry({
  fetch(request, opts) {
    return createWorkerHandler({
      assets: env.ASSETS,
      app: async (forwarded) => handler.fetch(forwarded, opts),
      // `__POSTHOG_KEY__` is empty in a build without a key, which counts nothing.
      analytics: { key: __POSTHOG_KEY__, waitUntil, limiter: env.DOCS_COUNT_LIMITER },
      limiters: {
        mcp: env.DOCS_MCP_LIMITER,
        search: env.DOCS_SEARCH_LIMITER,
        siteSearch: env.DOCS_SITE_SEARCH_LIMITER,
      },
    })(request);
  },
});
