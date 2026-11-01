import { describe, expect, it } from 'vitest';
import { getLLMText, markdownResponse, source } from './source';
import { createWorkerHandler, type Next } from './worker';

const HOST = 'https://docs.example';
const page = source.getPage(['quickstart'])!;
const landing = source.getPage([])!;

// What the platform and the router answer for the pages, as far as this layer
// can tell: the files hold each page at its address without a slash
// (`html_handling` in `wrangler.jsonc`) and redirect the slash form.
const files = (request: Request) => {
  const { pathname } = new URL(request.url);
  if (pathname === '/') {
    return Promise.resolve(new Response('<html>landing</html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  }
  if (pathname === '/quickstart') {
    return Promise.resolve(new Response('<html>quickstart</html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  }
  if (pathname === '/quickstart/') {
    return Promise.resolve(new Response(null, { status: 307, headers: { Location: '/quickstart' } }));
  }
  if (pathname === '/favicon.svg') {
    return Promise.resolve(new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } }));
  }
  return Promise.resolve(new Response('Not found', { status: 404 }));
};

// The router's own behavior that matters here: no HTML or wildcard in `Accept`
// is a 406, an unknown address renders the HTML not-found
// page, and a Worker route answers JSON whatever the header.
const seen: Request[] = [];
const app: Next = (request) => {
  seen.push(request);
  const { pathname } = new URL(request.url);
  if (pathname === '/version.json') {
    return Promise.resolve(new Response('{}', { headers: { 'Content-Type': 'application/json' } }));
  }
  if (pathname === '/api/docs/missing') {
    return Promise.resolve(new Response('{"error":"not_found"}', { status: 404, headers: { 'Content-Type': 'application/json' } }));
  }
  if (!/(^|,)\s*(\*\/\*|text\/html)/.test(request.headers.get('Accept') ?? '*/*')) {
    return Promise.resolve(Response.json({ error: 'Only HTML requests are supported here' }, { status: 406 }));
  }
  return Promise.resolve(new Response('<html>not found</html>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
};

const handle = createWorkerHandler({ assets: { fetch: files }, app });

function get(path: string, accept?: string, method = 'GET') {
  return handle(new Request(`${HOST}${path}`, { method, headers: accept ? { Accept: accept } : {} }));
}

describe('an address with a trailing slash', () => {
  it.each([
    ['/quickstart/', '/quickstart'],
    ['/run/deploy/', '/run/deploy'],
    ['/quickstart//', '/quickstart'],
    ['/quickstart/?q=1', '/quickstart?q=1'],
    ['/no-such-page/', '/no-such-page'],
  ])('sends %s to %s with a permanent redirect', async (from, to) => {
    for (const accept of ['text/html', 'text/markdown']) {
      seen.length = 0;
      const res = await get(from, accept);
      expect(res.status).toBe(301);
      expect(res.headers.get('Location')).toBe(`${HOST}${to}`);
      expect(seen).toHaveLength(0);
    }
  });

  it('answers HEAD with the same redirect', async () => {
    const res = await get('/quickstart/', undefined, 'HEAD');
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe(`${HOST}/quickstart`);
  });

  it('keeps a path that starts with slashes on this host', async () => {
    const res = await get('//evil.example/', 'text/html');
    expect(res.status).toBe(301);
    expect(new URL(res.headers.get('Location')!).host).toBe(new URL(HOST).host);
  });

  it('leaves the root alone', async () => {
    const res = await get('/', 'text/html');
    expect(res.status).toBe(200);
    expect(res.headers.get('Location')).toBeNull();
  });

  it('passes a write through, so a client posting to /mcp/ is not redirected', async () => {
    seen.length = 0;
    await handle(new Request(`${HOST}/mcp/`, { method: 'POST' }));
    expect(seen.map((request) => new URL(request.url).pathname)).toEqual(['/mcp/']);
  });
});

describe('a page address that prefers Markdown', () => {
  it('answers the page\'s .md copy', async () => {
    const res = await get('/quickstart', 'text/markdown');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown');
    expect(res.headers.get('Vary')).toBe('Accept');
    expect(await res.text()).toBe(await getLLMText(page));
  });

  it('answers what the .md address answers', async () => {
    // The `.md` route answers through `markdownResponse` too.
    const copy = await markdownResponse(page);
    const res = await get('/quickstart', 'text/markdown');
    expect(res.headers.get('Content-Type')).toBe(copy.headers.get('Content-Type'));
    expect(await res.text()).toBe(await copy.text());
  });

  it('answers an API operation page with its copy', async () => {
    const res = await get('/api-reference/apps/revokeAppGrant', 'text/markdown, text/html, */*');
    expect(res.headers.get('Content-Type')).toBe('text/markdown');
    expect(await res.text()).toContain('# ');
  });

  it('answers HEAD with the headers and no body', async () => {
    const res = await get('/quickstart', 'text/markdown', 'HEAD');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown');
    expect(res.headers.get('Vary')).toBe('Accept');
    expect(await res.text()).toBe('');
  });
});

describe('a page address that prefers HTML', () => {
  it.each([
    ['text/html'],
    ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
    ['*/*'],
    [undefined],
  ])('answers the file with Vary: Accept for Accept %s', async (accept) => {
    const res = await get('/quickstart', accept);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('Vary')).toBe('Accept');
    expect(await res.text()).toBe('<html>quickstart</html>');
  });

  it('does not add Accept to a Vary that already names it', async () => {
    const varied = createWorkerHandler({
      assets: { fetch: async () => new Response('x', { headers: { Vary: 'accept-encoding, Accept' } }) },
      app,
    });
    const res = await varied(new Request(`${HOST}/quickstart`));
    expect(res.headers.get('Vary')).toBe('accept-encoding, Accept');
  });
});

describe('an address that is not a page', () => {
  it('answers 404 as plain text to a client that prefers Markdown', async () => {
    for (const path of ['/no-such-page', '/no-such-page/deeper']) {
      const res = await get(path, 'text/markdown');
      expect(res.status).toBe(404);
      expect(res.headers.get('Content-Type')).toContain('text/plain');
      expect(res.headers.get('Vary')).toBe('Accept');
      expect(await res.text()).toBe('No such page.\n');
    }
  });

  it('answers HEAD 404 with no body', async () => {
    const res = await get('/no-such-page', 'text/markdown', 'HEAD');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('');
  });

  it('leaves the HTML not-found page to a browser', async () => {
    const res = await get('/no-such-page', 'text/html');
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    expect(res.headers.get('Vary')).toBe('Accept');
  });

  it('answers the landing page\'s .md copy at the root', async () => {
    const res = await get('/', 'text/markdown');
    expect(res.status).toBe(200);
    expect(res.headers.get('Vary')).toBe('Accept');
    expect(await res.text()).toBe(await getLLMText(landing));
  });

  it('serves the landing page\'s HTML at the root to a browser', async () => {
    const res = await get('/', 'text/html');
    expect(res.status).toBe(200);
    expect(res.headers.get('Vary')).toBe('Accept');
    expect(await res.text()).toBe('<html>landing</html>');
  });

  it('leaves a Worker route alone, including its own 404', async () => {
    expect((await get('/version.json', 'text/markdown')).headers.get('Content-Type')).toBe('application/json');
    const missing = await get('/api/docs/missing', 'text/markdown');
    expect(missing.status).toBe(404);
    expect(missing.headers.get('Content-Type')).toBe('application/json');
  });

  it.each(['/quickstart.md', '/llms.txt', '/docs-map.md', '/mcp', '/api/docs/topics', '/index.md'])(
    'passes %s to the router',
    async (path) => {
      seen.length = 0;
      await get(path, 'text/markdown');
      expect(seen.map((request) => new URL(request.url).pathname)).toEqual([path]);
    },
  );

  it('serves a static file whatever the Accept header says', async () => {
    const res = await get('/favicon.svg', 'text/markdown');
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml');
    expect(res.headers.get('Vary')).toBeNull();
  });
});

describe('a request that is not a read', () => {
  it('goes to the router without a file lookup', async () => {
    seen.length = 0;
    const res = await handle(new Request(`${HOST}/quickstart`, { method: 'POST', headers: { Accept: 'text/markdown' } }));
    expect(res.status).toBe(406);
    expect(seen).toHaveLength(1);
  });
});

describe('without an assets binding', () => {
  it('passes every request to the router and still negotiates', async () => {
    const bare = createWorkerHandler({ app });
    const md = await bare(new Request(`${HOST}/quickstart`, { headers: { Accept: 'text/markdown' } }));
    expect(md.headers.get('Content-Type')).toBe('text/markdown');
    const html = await bare(new Request(`${HOST}/quickstart`, { headers: { Accept: 'text/html' } }));
    expect(html.status).toBe(404);
  });
});
