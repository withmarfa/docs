import { describe, expect, it } from 'vitest';
import { handleDocsSearch, handleDocsTopics } from './docs-api';

const BASE = 'https://docs.example/api/docs';

function search(query: string): Promise<Response> {
  return handleDocsSearch(new Request(`${BASE}/search${query}`));
}

describe('GET /api/docs/search', () => {
  it('answers 200 JSON with the grouped hits', async () => {
    const res = await search('?q=housekeeping');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { hits: { title: string; url: string; snippets: string[] }[] };
    expect(body.hits.map((h) => h.url)).toContain('/run/housekeeping');
  });

  it('honors limit', async () => {
    const res = await search('?q=the&limit=1');
    expect(res.status).toBe(200);
    expect(((await res.json()) as { hits: unknown[] }).hits).toHaveLength(1);
  });

  it('accepts the limits 1 and 50', async () => {
    expect((await search('?q=the&limit=1')).status).toBe(200);
    expect((await search('?q=the&limit=50')).status).toBe(200);
  });

  it.each(['', '?q=', '?q=%20%20', '?limit=5'])('answers 400 invalid_query for %j', async (qs) => {
    const res = await search(qs);
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('invalid_query');
    expect(body.message).not.toBe('');
  });

  it.each(['0', '51', '-1', '1.5', 'abc', '', '1e1', '+5'])('answers 400 invalid_limit for limit=%j', async (limit) => {
    const res = await search(`?q=x&limit=${encodeURIComponent(limit)}`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('invalid_limit');
    expect(body.message).not.toBe('');
  });
});

describe('GET /api/docs/topics', () => {
  it('answers 200 JSON with every page', async () => {
    const res = handleDocsTopics();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { pages: Record<string, unknown>[] };
    expect(body.pages.length).toBeGreaterThan(0);
    expect(Object.keys(body.pages[0]!).sort()).toEqual(['breadcrumbs', 'description', 'title', 'url']);
  });
});
