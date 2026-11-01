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
      // Prerender starts at the landing page, `/`, and crawls its links. No
      // page links to the sitemap, so it is listed for prerender to write.
      pages: [{ path: '/' }, { path: '/sitemap.xml' }],
      prerender: {
        enabled: true,
        // /version.json, /mcp and everything under /api/ must stay Worker
        // routes rather than being frozen into the asset store. Prerender
        // crawls links, so a docs page that links to one of them would otherwise
        // turn it into a static asset: /version.json would answer from a cache
        // instead of the route's `no-store`, and the JSON and MCP addresses
        // would answer from a frozen file, ignoring the query.
        //
        // Crawled links arrive as the href was written rather than normalized,
        // so `./version.json`, `../api/search` and `/api/docs/topics/?x=1` all
        // have to miss an exact-string comparison. Resolve the path against a
        // dummy origin first, which drops dot segments, the query and the
        // fragment, then compare. `version.json` is matched by its final segment.
        filter: (page: { path: string }) => {
          let path: string;
          try {
            path = new URL(page.path, 'http://prerender.invalid/').pathname;
          } catch {
            return true;
          }
          if (path.replace(/^.*\//, '') === 'version.json') return false;
          if (path === '/api' || path.startsWith('/api/')) return false;
          return path.replace(/\/+$/, '') !== '/mcp';
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
