/**
 * The one binding the docs Worker reads, declared by hand for the same reason
 * `src/status/cloudflare-env.d.ts` is: `wrangler types` generates fourteen
 * thousand lines for one `fetch`. The status target excludes this file, and this
 * target excludes that one, because two declarations of one module do not merge.
 */
declare module 'cloudflare:workers' {
  export const env: {
    /** The static files, bound by `assets.binding` in `wrangler.jsonc`. Optional, so the stages also run where no binding exists, as they do in tests. */
    ASSETS?: { fetch(request: Request): Promise<Response> };
  };
}
