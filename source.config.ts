import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { pageSchema } from 'fumadocs-core/source/schema';
import * as z from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      // The deepest heading level the page's "On this page" list shows.
      // Fumadocs has no such option, and a page that includes a long generated
      // reference would otherwise list every heading in it.
      tocDepth: z.number().int().min(2).max(6).optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig();
