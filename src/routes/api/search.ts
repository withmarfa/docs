import { createFileRoute } from '@tanstack/react-router';
import { searchServer } from '@/lib/docs-tools';

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async ({ request }) => searchServer.GET(request),
    },
  },
});
