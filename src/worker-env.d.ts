/**
 * What the docs Worker reads from `cloudflare:workers`, declared by hand for the
 * same reason `src/status/cloudflare-env.d.ts` is: `wrangler types` generates
 * fourteen thousand lines for one `fetch`. The status target excludes this file,
 * and this target excludes that one, because two declarations of one module do
 * not merge.
 */
declare module 'cloudflare:workers' {
  type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

  /**
   * Every binding is optional, so the stages also run where none exists, as they
   * do in tests and, for the limiters, wherever a config omits them.
   */
  export const env: {
    /** The static files, bound by `assets.binding` in `wrangler.jsonc`. */
    ASSETS?: { fetch(request: Request): Promise<Response> };
    /** The limit on `/mcp`, bound by `ratelimits` in `wrangler.jsonc`. */
    DOCS_MCP_LIMITER?: RateLimiter;
    /** The limit on `/api/docs/search`, bound by `ratelimits` in `wrangler.jsonc`. */
    DOCS_SEARCH_LIMITER?: RateLimiter;
  };

  /** Keeps the Worker running until the promise settles, without holding the response. */
  export function waitUntil(promise: Promise<unknown>): void;
}
