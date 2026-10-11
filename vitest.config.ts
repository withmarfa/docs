import { defineConfig } from 'vitest/config';
import mdx from 'fumadocs-mdx/vite';
import { fileURLToPath } from 'node:url';

// The MCP tools query the same docs source the site does, and that source is a
// generated index of `import.meta.glob`ed content. Tests therefore run through
// Vite with the MDX plugin loaded, so the corpus under test is the real one.
// The app's own plugins (Cloudflare, TanStack Start, React) are deliberately
// absent: nothing under test renders, and loading them would drag a browser
// runtime into a request-and-response test.
export default defineConfig({
  plugins: [mdx()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      collections: fileURLToPath(new URL('./.source', import.meta.url)),
    },
  },
});
