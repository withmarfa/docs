import { createFileRoute } from '@tanstack/react-router';
import { handleDocsTopics } from '@/lib/docs-api';

export const Route = createFileRoute('/api/docs/topics')({
  server: {
    handlers: {
      GET: async () => handleDocsTopics(),
    },
  },
});
