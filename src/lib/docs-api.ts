/**
 * Request handlers for the JSON addresses under `/api/docs/`.
 *
 * Kept apart from the route files so a test can call them without a router.
 * A page is not served here: a client fetches `/<path>.md`.
 */

import { listTopics, MAX_SEARCH_LIMIT, searchDocs } from '@/lib/docs-tools';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * The answer to a client over its limit, in the same `{ error, message }` shape
 * as the other errors here. `Retry-After` is in seconds.
 */
export function rateLimited(retryAfterSeconds: number): Response {
  const response = json(
    { error: 'rate_limited', message: `Too many requests. Try again in ${retryAfterSeconds} seconds.` },
    429,
  );
  response.headers.set('Retry-After', String(retryAfterSeconds));
  return response;
}

/** `GET /api/docs/search?q=<query>&limit=<n>` */
export async function handleDocsSearch(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  const query = params.get('q') ?? '';
  if (!query.trim()) {
    return json({ error: 'invalid_query', message: '`q` is required' }, 400);
  }

  let limit: number | undefined;
  const rawLimit = params.get('limit');
  if (rawLimit !== null) {
    limit = /^\d+$/.test(rawLimit) ? Number(rawLimit) : NaN;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_LIMIT) {
      return json(
        { error: 'invalid_limit', message: `\`limit\` must be an integer from 1 to ${MAX_SEARCH_LIMIT}` },
        400,
      );
    }
  }

  return json(await searchDocs(query, limit));
}

/** `GET /api/docs/topics` */
export function handleDocsTopics(): Response {
  return json(listTopics());
}
