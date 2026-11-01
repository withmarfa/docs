import { createFileRoute } from '@tanstack/react-router';
import { siteUrl } from '@/lib/shared';

// A route rather than a file in `public/`, which the status page shares. Every
// crawler, AI crawlers included, may read every page.
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      async GET() {
        return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, {
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
