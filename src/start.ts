import { createMiddleware, createStart } from '@tanstack/react-start';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { redirect } from '@tanstack/react-router';
import { slugsToMarkdownPath } from './lib/source';

// Routes served at the site root that are NOT doc pages and must never be
// rewritten to a `.md` twin. The dedicated text/agent surfaces (`/llms.txt`,
// `/docs-map.md`, `/mcp`) and API endpoints (`/api/*`) live here.
const NON_DOC_PREFIXES = ['/api/', '/mcp', '/llms.txt', '/llms-full.txt', '/docs-map.md'];

function isDocPath(pathname: string): boolean {
  // The bare site root is a redirect to `/get-started`, not a page, so there is
  // no `/index.md` twin to rewrite to. Leave `/` for the index route.
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
    // The bare site root has no page of its own. A markdown client can't
    // follow the HTML index redirect, so send it straight to the landing page,
    // and the follow-up request picks up the `.md` twin below.
    if (url.pathname === '/') {
      url.pathname = '/get-started';
      throw redirect({ href: url.pathname + url.search });
    }

    // Docs live at the root now, so there's no `/docs` prefix to gate on.
    // Rewrite a real, extensionless doc page to its `.md` twin — never an
    // asset, a `.md`/`.txt` file, or a non-doc route.
    if (isDocPath(url.pathname)) {
      const slugs = url.pathname.split('/').filter((v) => v.length > 0);
      url.pathname = slugsToMarkdownPath(slugs).url;

      throw redirect({ href: url.pathname + url.search });
    }
  }

  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [llmMiddleware],
  };
});
