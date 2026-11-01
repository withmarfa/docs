import { createFileRoute } from '@tanstack/react-router';
import { buildSitemap } from '@/lib/sitemap';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      async GET() {
        return new Response(buildSitemap(), {
          headers: { 'content-type': 'application/xml; charset=utf-8' },
        });
      },
    },
  },
});
