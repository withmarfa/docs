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
// MARFA_BUILD_COMMIT is set by the publish workflow to the same expression it
// checks out, so the stamp cannot disagree with what was deployed.
// Deliberately not GITHUB_SHA: on a `workflow_run` event that is the default
// branch head rather than the commit the triggering run passed on, so a re-run
// of an older run would have deployed old content while stamping current main
// and every later check would have compared equal and reported green.
//
// The dirty suffix is the other half. A hand-deploy from a modified tree would
// otherwise stamp a commit whose tree does not contain the code being served,
// which defeats the same check the same way.
function buildCommit(): string {
  if (process.env.MARFA_BUILD_COMMIT) return process.env.MARFA_BUILD_COMMIT;
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
