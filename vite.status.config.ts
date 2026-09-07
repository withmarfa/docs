import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { buildCommit } from './build-commit';
import { posthogKey } from './build-analytics';

// The status page. A second Worker built from this repository so it wears the
// docs site's stylesheet and theme, deployed separately so it does not share
// the docs site's fate — it reports on that site, and a page that goes down
// with the thing it watches reports nothing at the only moment it matters.
//
// Deliberately absent, each for its own reason:
//
// - `mdx()`. There is no content collection here, and loading it would invite
//   an import that drags the whole docs corpus into this bundle.
// - `resolve.tsconfigPaths`. The `@/*` alias points into the docs application,
//   so an aliased import inside `src/status` would silently build the wrong
//   thing. Without the resolver it fails the build instead. Use relative paths.
// - Prerender. The page answers "what is true now" from a store written every
//   few minutes; freezing it at build time would answer with whatever was true
//   when it was built.
export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __POSTHOG_KEY__: JSON.stringify(posthogKey()),
  },
  server: {
    // Not 3000. Both dev servers get run in the same tree.
    port: 3001,
  },
  build: {
    // Both targets otherwise default to `dist/` and clobber each other.
    outDir: 'dist-status',
  },
  plugins: [
    tailwindcss(),
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      configPath: './wrangler.status.jsonc',
    }),
    tanstackStart({
      srcDirectory: 'src/status',
      prerender: { enabled: false },
    }),
    react(),
  ],
  resolve: {
    // Force a single React instance, matching the docs build.
    dedupe: ['react', 'react-dom'],
  },
});
