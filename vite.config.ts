import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

// The commit this bundle was built from, served at /version.json so that
// "is this change live?" is a fetch rather than a reading of the prose.
//
// The dirty suffix is the load-bearing part. A hand-deploy from a modified
// tree would otherwise stamp the bundle with a commit whose tree does not
// contain the code being served, and the staleness check would compare equal
// and report green. That is the exact failure this endpoint exists to catch,
// so it must not be the first thing the endpoint does.
function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    return dirty ? `${head}-dirty` : head;
  } catch {
    // No git, no answer. "unknown" never compares equal to a real commit, so
    // a checker reports a problem rather than being quietly satisfied.
    return 'unknown';
  }
}

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
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
        // `no-store`. Excluding it explicitly means the endpoint's
        // correctness does not depend on nobody linking it.
        filter: (page: { path: string }) => page.path !== '/version.json',
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
