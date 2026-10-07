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
