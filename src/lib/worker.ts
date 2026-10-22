import { prefersMarkdown } from '@/lib/accept';
import { agentReads, type AgentReadOptions } from '@/lib/agent-reads';
import { rateLimit, type Limiters } from '@/lib/rate-limit';
import { markdownResponse, pageForPath } from '@/lib/source';

/**
 * What the docs Worker does to a request before the router sees it.
 *
 * Each stage either answers or passes the request on, so a stage added later
 * needs one line in `createWorkerHandler` and no edit to another. The Worker
 * runs ahead of the static files for every address but the build's own assets
 * (`run_worker_first` in `wrangler.jsonc`), which is what lets a stage see a
 * request for a prerendered page at all.
 */
export type Next = (request: Request) => Promise<Response>;
export type Stage = (request: Request, next: Next) => Promise<Response>;
export type Assets = { fetch(request: Request): Promise<Response> };

export function compose(stages: Stage[], app: Next): Next {
  return stages.reduceRight<Next>((next, stage) => (request) => stage(request, next), app);
}

function isRead(request: Request): boolean {
  return request.method === 'GET' || request.method === 'HEAD';
}

function withVaryAccept(response: Response): Response {
  const vary = response.headers.get('Vary') ?? '';
  if (/(^|,)\s*(accept|\*)\s*(,|$)/i.test(vary)) return response;
  const copy = new Response(response.body, response);
  copy.headers.append('Vary', 'Accept');
  return copy;
}

/**
 * The router answers a request whose `Accept` names no HTML or wildcard with
 * `406`, whatever the address. A client that wants Markdown and asks for the
 * root or a missing page should get the redirect or a `404`, so the router sees
 * a wildcard behind the Markdown it asked for.
 */
function withWildcard(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set('Accept', `${headers.get('Accept') ?? ''}, */*;q=0.1`);
  return new Request(request, { headers });
}

function isHtml(response: Response): boolean {
  return (response.headers.get('Content-Type') ?? '').toLowerCase().startsWith('text/html');
}

/**
 * A page address answers with the page's Markdown copy when `Accept` ranks
 * `text/markdown` above `text/html`, and with HTML otherwise. A page address is
 * the page's path with or without a trailing slash. Either answer, and the
 * redirect from the address without a slash, carries `Vary: Accept`, so a cache
 * keeps the two forms apart.
 *
 * Any other address passes through, except that the router's HTML not-found
 * page, which differs by `Accept`, carries `Vary: Accept`, and a client asking
 * for Markdown gets a plain `404` in its place, as a `.md` address that is not
 * a page does.
 */
export const markdownNegotiation: Stage = async (request, next) => {
  if (!isRead(request)) return next(request);

  const wantsMarkdown = prefersMarkdown(request.headers.get('Accept'));
  const page = pageForPath(new URL(request.url).pathname);

  if (page && wantsMarkdown) {
    const response = await markdownResponse(page, { Vary: 'Accept' });
    return request.method === 'HEAD' ? new Response(null, response) : response;
  }
  if (page) return withVaryAccept(await next(request));

  const response = await next(wantsMarkdown ? withWildcard(request) : request);
  if (response.status !== 404 || !isHtml(response)) return response;
  if (!wantsMarkdown) return withVaryAccept(response);
  return new Response(request.method === 'HEAD' ? null : 'No such page.\n', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', Vary: 'Accept' },
  });
};

/**
 * The prerendered pages and the build's other files. With the Worker running
 * first, nothing else serves them. An address with no file passes on to the
 * router, which answers the Worker routes and the not-found page.
 */
export function staticAssets(assets: Assets | undefined): Stage {
  return async (request, next) => {
    if (assets && isRead(request)) {
      const response = await assets.fetch(request);
      if (response.status !== 404) return response;
    }
    return next(request);
  };
}

export type WorkerOptions = {
  assets?: Assets;
  app: Next;
  /** Counts agent reads in PostHog, bounded by its own limiter. Left out, nothing is counted. */
  analytics?: AgentReadOptions;
  /** The rate limiting bindings. A limiter left out is not applied. */
  limiters?: Limiters;
};

/**
 * Counting runs outermost, so it sees the final response, and sends nothing for
 * a `429`. The limit runs before negotiation and the files, so a refused client
 * costs the Worker nothing else.
 */
export function createWorkerHandler({ assets, app, analytics, limiters = {} }: WorkerOptions): Next {
  const stages: Stage[] = [];
  if (analytics?.key) stages.push(agentReads(analytics));
  stages.push(rateLimit(limiters), markdownNegotiation, staticAssets(assets));
  return compose(stages, app);
}
