import { rateLimited } from '@/lib/docs-api';
import { mcpRateLimited } from '@/lib/mcp/server';
import type { Stage } from '@/lib/worker';

/**
 * A per-client limit on the three public addresses that run a search or a tool
 * and need no credential: `/mcp`, `/api/docs/search` and the site's own search
 * box, `/api/search`. The MCP tools specification says a server MUST rate limit
 * tool invocations. The search box has a limit of its own, far above what a
 * person typing reaches, because its answer costs the same as the JSON
 * address's.
 *
 * The limit is Cloudflare's Workers rate limiting binding (`ratelimits` in
 * `wrangler.jsonc`). The client's address is the key. Cloudflare counts it in
 * memory at the edge; nothing here stores it, logs it or sends it to PostHog.
 * Cloudflare's counts are per location and approximate, which suits a guard
 * against a flood and would not suit an exact quota.
 */

/** The minimal shape of a rate limiting binding. */
export type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

export type Limiters = { mcp?: Limiter; search?: Limiter; siteSearch?: Limiter };

/**
 * The window of every binding, in seconds, and the `Retry-After` a refused
 * client gets: the longest it can wait before its count starts again.
 * `wrangler.jsonc` must say the same; `wrangler-config.test.ts` checks it.
 */
export const RATE_LIMIT_PERIOD_SECONDS = 60;

/**
 * Refuses a client over its limit with `429`. A limiter that is not bound, as
 * in local development and in tests, is skipped, and so is a request with no
 * client address or a limiter that fails: the limit guards the site, and a
 * fault in it must not take the site down.
 */
export function rateLimit(limiters: Limiters): Stage {
  return async (request, next) => {
    if (request.method === 'OPTIONS') return next(request);

    const { pathname } = new URL(request.url);
    const mcp = pathname === '/mcp';
    const limiter = mcp
      ? limiters.mcp
      : pathname === '/api/docs/search'
        ? limiters.search
        : pathname === '/api/search'
          ? limiters.siteSearch
          : undefined;
    const client = request.headers.get('CF-Connecting-IP');
    if (!limiter || !client) return next(request);

    let allowed = true;
    try {
      allowed = (await limiter.limit({ key: client })).success;
    } catch {
      // Fail open.
    }
    if (allowed) return next(request);
    return mcp ? mcpRateLimited(RATE_LIMIT_PERIOD_SECONDS) : rateLimited(RATE_LIMIT_PERIOD_SECONDS);
  };
}
