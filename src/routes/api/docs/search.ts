import { createFileRoute } from '@tanstack/react-router';
import { handleDocsSearch } from '@/lib/docs-api';

export const Route = createFileRoute('/api/docs/search')({
  server: {
    handlers: {
      GET: async ({ request }) => handleDocsSearch(request),
    },
  },
});
