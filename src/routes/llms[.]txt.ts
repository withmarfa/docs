import { createFileRoute } from '@tanstack/react-router';
import { buildLlmsTxt } from '@/lib/docs-map';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      async GET() {
        return new Response(buildLlmsTxt(), {
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
