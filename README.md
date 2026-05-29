# Marfa docs

Source for the public documentation site at <https://docs.marfa.so>. Built with
[Fumadocs](https://fumadocs.dev) on [TanStack Start](https://tanstack.com/start),
deployed to [Cloudflare Workers](https://workers.cloudflare.com) via
`@cloudflare/vite-plugin`.

This README is for contributors to the site. End users should read the published
docs.

## Structure

- **`content/docs/`** — MDX content tree. Layout maps 1:1 to URL structure.
  See `meta.json` files for per-section navigation order and titles.
- **`source.config.ts`** — Fumadocs MDX config; defines collections.
- **`src/routes/`** — TanStack Start routes (`__root.tsx`, `docs/$.tsx`, the
  `.md`-twin handler, `llms.txt`, `llms-full.txt`, `docs-map.md`,
  `api/search.ts`).
- **`src/lib/source.ts`** — Fumadocs source loader; `getLLMText` helper.
- **`vite.config.ts`** — Vite config with Fumadocs MDX plugin, TanStack Start,
  Tailwind, and the Cloudflare Workers plugin.
- **`wrangler.jsonc`** — Cloudflare Workers config (custom domain
  `docs.marfa.so`).

## Local development

Requires Node 22 and pnpm.

```bash
pnpm install
pnpm dev
```

Dev server runs at `http://localhost:3000`.

## Build and preview

```bash
pnpm build      # Vite + Fumadocs MDX postprocess
pnpm preview    # Cloudflare Workers preview locally
```

## Deploying to Cloudflare Workers

The site deploys to `docs.marfa.so` via the Cloudflare Workers `marfa-docs`
project. The Worker is served from `@tanstack/react-start/server-entry` with
`nodejs_compat`.

```bash
# CI/CD uses the marfa Cloudflare account token; locally set the same env var
# from your dev secrets.
export CLOUDFLARE_API_TOKEN="<marfa account user token>"
pnpm deploy
```

The deploy script runs `pnpm build` then `wrangler deploy`.

## Machine-readable surfaces

The site emits a small family of machine-readable artifacts for agent consumers:

- `<path>.md` — markdown-twin of any docs HTML page. Stripe-style convention,
  large payload reduction for agent consumers.
- `/llms.txt` — short index page (Vercel convention).
- `/llms-full.txt` — long-form concatenation of every page's markdown.
- `/docs-map.md` — hierarchical map of every page grouped by section
  (Anthropic-style; see `claude_code_docs_map.md`).

Content negotiation: a request to a docs HTML URL with `Accept: text/markdown`
is redirected to the corresponding `.md` URL by the middleware in
`src/start.ts`.

## OpenAPI sync

The API reference section is driven by `openapi.json`, kept in sync with the
monorepo server:

```bash
./scripts/sync-openapi.sh
```

Expects the monorepo at `../marfa`. Override with `MARFA_ROOT=/path/to/marfa`.
