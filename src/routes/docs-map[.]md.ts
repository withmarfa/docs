import { createFileRoute } from '@tanstack/react-router';
import { buildDocsMap } from '@/lib/docs-map';

export const Route = createFileRoute('/docs-map.md')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildDocsMap(), {
          headers: { 'Content-Type': 'text/markdown' },
        }),
    },
  },
});
