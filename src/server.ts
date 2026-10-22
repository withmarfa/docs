import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { env } from 'cloudflare:workers';
import { createWorkerHandler } from '@/lib/worker';

// The Worker's one entry. The stages it runs are in `src/lib/worker.ts`.
export default createServerEntry({
  fetch(request, opts) {
    return createWorkerHandler({
      assets: env.ASSETS,
      app: async (forwarded) => handler.fetch(forwarded, opts),
    })(request);
  },
});
