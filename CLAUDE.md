# Marfa Docs

Public documentation site at `docs.marfa.so`. Built with [Fumadocs](https://fumadocs.dev) on [TanStack Start](https://tanstack.com/start), deployed to Cloudflare Workers via `@cloudflare/vite-plugin`.

Docs MCP convention: when working on documented surfaces (types, edges, runtime substrates, connections, auth flows), query the docs MCP at `https://docs.marfa.so/mcp` (or use `marfa docs search "<query>"` from CLI) before re-deriving from source. After changing a public surface, update the relevant docs page in the same PR.

## Framework

- **Fumadocs UI** on **TanStack Start** — TypeScript ESM, Vite-driven, no Next.js dependency.
- **`source.config.ts`** — Fumadocs MDX configuration; content lives under `content/docs/`.
- **`meta.json`** files per folder configure sidebar grouping + ordering.
- **OpenAPI** — `openapi.json` at repo root drives the API reference. Sync from the monorepo via `scripts/sync-openapi.sh`.

## Build and preview

```bash
pnpm install        # Node 22+
pnpm dev            # http://localhost:3000
pnpm build          # vite build (full prerender) + tsc --noEmit
pnpm preview        # serve the production build locally
pnpm deploy         # pnpm build && wrangler deploy
```

## Content shape

Each `.mdx` page starts with YAML frontmatter:

```mdx
---
title: Page Title
description: One-line summary shown in nav, search, meta tags.
---
```

YAML caveat: descriptions starting with `@`, `:`, `>`, `|`, `*`, `&`, `?`, `%` need quoting (`description: "@withmarfa/sdk ..."`) — bare leading sigils confuse the YAML parser.

Body is MDX. Default components (`Card`, `Cards`, `Callout`) auto-import via `getMDXComponents`. For others, import explicitly:

```mdx
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
```

## Navigation hierarchy

Hierarchy lives in `meta.json` files per folder; each defines `title` and `pages` (an ordered list of slugs). Top-level groups: **Get started** / **Concepts** (sub-grouped: Data primitives / Schema / Identity / Lifecycle / Connections) / **API** / **SDKs and Clients** / **Self-hosting** (sub-grouped: Run / Operate).

Adding a page: drop the `.mdx` file in the right folder, register it in the folder's `meta.json`. No central manifest.

## OpenAPI sync

```bash
./scripts/sync-openapi.sh
```

Expects the monorepo at `../marfa`. Override with `MARFA_ROOT=/path/to/marfa scripts/sync-openapi.sh`. Run after any API change merges in the monorepo.

## Machine-readable surfaces

Four shapes shipped natively, no separate build:

- **`.md`-twin per page** — `Accept: text/markdown` or append `.md` to any docs URL returns the raw Markdown
- **`/llms.txt`** — short hierarchical index (Fumadocs `llms(source).index()`)
- **`/llms-full.txt`** — concatenated full corpus
- **`/docs-map.md`** — Anthropic-style hierarchical link map

Source code: `src/routes/docs/$.tsx`, `src/routes/llms[.]txt.ts`, `src/routes/llms-full[.]txt.ts`, `src/routes/docs-map[.]md.ts`.

## Docs MCP

In-tree at `src/lib/mcp/` + HTTP route at `src/routes/mcp.ts`. Three tools:

- `docs_search(query, limit?)` — BM25 over the Orama index
- `docs_fetch(path)` — markdown for a path (matches the `.md`-twin)
- `docs_list_topics()` — hierarchical taxonomy

BM25-only at launch (Worker bundle-size constraint on dense embeddings; upgrade path is Workers AI bge-small or an external vector index). No auth — public docs are public.

CLI bridge: `marfa docs search/get/list` in `@withmarfa/cli@1.2.0+` wraps the MCP HTTP API; `--docs-url` flag for self-hosters.

## Principles

The docs are grounded in six rules. Any edit that violates one is a bug.

1. **One concept per page.** No overview pages duplicating downstream content. The nav is the map.
2. **Present tense only.** Describe what exists. No "planned" / "coming soon" / "will". Version-gated material lives in release notes.
3. **Defer to OpenAPI.** Request and response shapes live in the auto-generated reference. Narrative pages explain semantics the spec can't encode — flows, decision rules, state machines.
4. **Catalogues in tables, accordions, or tabs.** Not bullet walls. More than four items of the same kind: pick a scannable layout.
5. **Components for their purpose.** `<Steps>` for ordered procedures. `<Accordions>` for reference detail that isn't read linearly. `<Tabs>` for language or mode comparisons. `<Callout>` for callouts that interrupt flow meaningfully.
6. **Stability test.** Every claim that could plausibly change in three months either links a source of truth (spec, SDK, release note) or gets removed. Prose restating an endpoint shape, param name, or field ordering fails this test.

## Style

- **Examples minimal.** One curl / one SDK snippet per endpoint unless more adds information.
- **Direct, declarative voice.** State the rule; don't hedge. No filler intensifiers (genuinely, really, actually, fundamentally, very, quite, basically).
- **No personal infrastructure** — never internal hostnames, private IPs, launchd labels, or vault paths.

## Deployment

`docs.marfa.so` is a Cloudflare Worker. `pnpm deploy` runs `pnpm build && wrangler deploy`. Custom domain wired in `wrangler.jsonc`. Account: `marfa` (use `wrangler-marfa` helper to set the token).

## Conventions

Cross-repo conventions (American English, Conventional Commits with scope, TypeScript ESM, Prettier single quotes, no personal infra) come from the parent `.claude/CLAUDE.md`.
