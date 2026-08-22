import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

// The commit this bundle was built from, served at /version.json so that
// "is this change live?" is a fetch rather than a reading of the prose.
// GITHUB_SHA in CI, the working tree's HEAD locally, and an explicit
// "unknown" if neither can be determined — never a stale or invented value,
// because a wrong answer here is worse than no answer.
function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
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
