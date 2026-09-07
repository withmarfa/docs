import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { buildCommit } from './build-commit';
import { posthogKey } from './build-analytics';

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __POSTHOG_KEY__: JSON.stringify(posthogKey()),
  },
  server: {
    port: 3000,
  },
  plugins: [
    mdx(),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({
      prerender: {
        enabled: true,
        // /version.json must stay a Worker route rather than being frozen
        // into the asset store. Prerender crawls links, so a docs page
        // linking to it would otherwise turn it into a static asset served
        // with the asset store's cache headers instead of the route's
        // `no-store`, and the one endpoint whose job is answering "what is
        // live right now" would answer from a cache.
        //
        // Crawled links arrive as the href was written rather than normalized,
        // so `./version.json` and `/version.json?x=1` both have to miss an
        // exact-string comparison. Compare the final path segment instead.
        filter: (page: { path: string }) => {
          const path = page.path.split('?')[0].split('#')[0];
          return path.replace(/^.*\//, '') !== 'version.json';
        },
      },
    }),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
    // Force a single React instance — fumadocs-openapi's UI otherwise pulls a
    // second copy under the workerd SSR environment, nulling React's dispatcher.
    dedupe: ['react', 'react-dom'],
    alias: {
      tslib: 'tslib/tslib.es6.js',
    },
  },
  ssr: {
    // Bundle the OpenAPI UI into the SSR build so it shares the app's React.
    noExternal: ['fumadocs-openapi'],
  },
});
