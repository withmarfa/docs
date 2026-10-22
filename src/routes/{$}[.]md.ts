import { createFileRoute } from '@tanstack/react-router';
import { markdownPathToSlugs, markdownResponse, source } from '@/lib/source';

// A missing page answers with a plain 404 here. Throwing the router's
// `notFound()` from a server handler answers 200 with a JSON body, which a
// client reads as a page that exists.
export const Route = createFileRoute('/{$}.md')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = markdownPathToSlugs(params._splat?.split('/') ?? []);
        const page = source.getPage(slugs);
        if (!page) {
          return new Response('No such page.\n', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }

        return markdownResponse(page);
      },
    },
  },
});
