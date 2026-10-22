# Marfa Docs

Source for the public documentation site at <https://docs.marfa.so>, and for
the status page at <https://status.marfa.so>. Built with
[Fumadocs](https://fumadocs.dev) on [TanStack Start](https://tanstack.com/start),
deployed to [Cloudflare Workers](https://workers.cloudflare.com) via
`@cloudflare/vite-plugin`.

This README is for contributors to the sites. Readers should read the published
docs. Pages are written to [`STYLE.md`](STYLE.md), and [`AGENTS.md`](AGENTS.md)
holds the rules for working in this repository.

## Two Workers, one repository

The documentation site is the default build target. The status page is the
second, and it lives in `src/status/` with its own Vite config, its own
`wrangler.status.jsonc` and its own output directory.

They share a stylesheet and a `public/` directory, so the two sites read as one
product and cannot end up wearing different marks. They deploy separately on
purpose: the status page reports on the documentation site, and a page that goes
down alongside the thing it watches reports nothing at the only moment anyone
needs it.

**Never build both targets and then run a bare `wrangler deploy`.** The
Cloudflare plugin writes one deploy pointer per project root and every build
rewrites it, so that deploys whichever target built last. The `deploy:status`
script passes the config its own build emitted, which is why it is the safe one.

## Structure

- **`content/docs/`**: the MDX content tree, mapping one to one onto URLs,
  except that a folder in parentheses, such as `(overview)/`, adds nothing to
  the URL. Each folder's `meta.json` sets its navigation order and titles.
- **`source.config.ts`**: Fumadocs MDX collections.
- **`src/routes/`**: documentation routes: `$.tsx` renders a page, `{$}[.]md.ts`
  serves its Markdown twin, and the rest are the machine-readable surfaces below.
- **`src/lib/mcp/`**: the docs MCP server, mounted at `/mcp` by
  `src/routes/mcp.ts` and over stdio by `pnpm mcp:stdio`.
- **`src/status/`**: the status page: its own routes, components and store
  reader. It reads a D1 database written by a separate checker and never
  writes to it.
- **`openapi.json`**: drives the API reference; synced from the monorepo rather
  than edited here.

## Local development

Node 22.22.2 or later (24.15 or later on Node 24) and pnpm.

```bash
pnpm install
pnpm dev                            # the docs site, http://localhost:3000
pnpm exec vite dev -c vite.status.config.ts   # the status page, port 3001
```

The status page reads a Cloudflare D1 binding that a separate checker writes.
A local run starts with an empty database that has no table, so the page
answers with its error page and a 500 status.

## Checks

```bash
pnpm test           # vitest, including the MCP protocol conformance suite
pnpm build          # the docs site
pnpm build:status   # the status page
pnpm types:check    # both TypeScript projects
```

`types:check` runs after both builds, not instead of them. The two generated
route trees register into one global interface, so compiled together without
both built the losing target's route types silently become `undefined`.

## Publishing

**Merging to `main` publishes.** The `Publish` workflow waits for CI to pass on
`main`, builds that commit, deploys it, and then fetches `/version.json` from the
live site to prove readers were served the new bundle. A deploy command
returning zero is not that proof.

Each Worker publishes in its own job against its own hostname, and only when
something its target builds from has changed. A manual run with `mode` set to
`check` compares both live commits against `main` and fails the run if either
is behind.

`pnpm run deploy` and `pnpm run deploy:status` still work and are the fallback if
the CI credential is ever missing. Use `run`: `pnpm deploy` is pnpm's own
built-in and will not invoke the script.

## Machine-readable surfaces

- **`<path>.md`**: the Markdown twin of any documentation page. A page's own
  address answers the same Markdown to `Accept: text/markdown`.
- **`/llms.txt`**: a short hierarchical index.
- **`/llms-full.txt`**: every page's Markdown, concatenated.
- **`/docs-map.md`**: every page as a link map, grouped by section.
- **`/mcp`**: the docs MCP server: search, fetch and list.

The status page publishes its own two: `/api/data` for the current state and
`/feed.xml` as Atom.

## Sync from Marfa

```bash
./scripts/sync-from-marfa.sh
```

Expects the server monorepo at `../marfa`; override with `MARFA_ROOT`. It
writes `openapi.json` and the files under `src/generated/`, and its header lists
each one. Run it by hand after an API, glossary, command, table or release
change lands in the monorepo; nothing runs it for you.

Close a gap in the spec in the monorepo's generator, never by editing
`openapi.json` here.
