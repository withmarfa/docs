import { createMiddleware, createStart } from '@tanstack/react-start';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { redirect } from '@tanstack/react-router';
import { slugsToMarkdownPath } from './lib/source';

// Routes served at the site root that are NOT doc pages and must never be
// rewritten to a `.md` twin. The dedicated text/agent surfaces (`/llms.txt`,
// `/docs-map.md`, `/mcp`) and API endpoints (`/api/*`) live here.
const NON_DOC_PREFIXES = ['/api/', '/mcp', '/llms.txt', '/llms-full.txt', '/docs-map.md'];

function isDocPath(pathname: string): boolean {
  // The bare site root is a redirect to `/introduction`, not a page — there's
  // no `/index.md` twin to rewrite to, so leave `/` for the index route.
  if (pathname === '/') return false;
  // Static assets and already-served files carry a file extension on the final
  // path segment (`.css`, `.js`, `.png`, `.md`, `.txt`, …). Doc page URLs are
  // extensionless, so a dot in the last segment means "not a doc page".
  const lastSegment = pathname.split('/').pop() ?? '';
  if (lastSegment.includes('.')) return false;
  for (const prefix of NON_DOC_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return false;
  }
  return true;
}

const llmMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);

  if (isMarkdownPreferred(request)) {
    // The bare site root has no page of its own (it redirects to Introduction).
    // A markdown client can't render the HTML index redirect, so send it
    // straight to the Introduction landing — the follow-up request picks up the
    // `.md` twin below.
    if (url.pathname === '/') {
      url.pathname = '/introduction';
      throw redirect(url);
    }

    // Docs live at the root now, so there's no `/docs` prefix to gate on.
    // Rewrite a real, extensionless doc page to its `.md` twin — never an
    // asset, a `.md`/`.txt` file, or a non-doc route.
    if (isDocPath(url.pathname)) {
      const slugs = url.pathname.split('/').filter((v) => v.length > 0);
      url.pathname = slugsToMarkdownPath(slugs).url;

      throw redirect(url);
    }
  }

  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [llmMiddleware],
  };
});
