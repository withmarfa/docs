# Marfa Docs

Public documentation site at `docs.marfa.so`. Built with [Fumadocs](https://fumadocs.dev) on [TanStack Start](https://tanstack.com/start), deployed to Cloudflare Workers via `@cloudflare/vite-plugin`.

Docs MCP convention: when working on documented surfaces (types, edges, runtime substrates, connections, auth flows), query the docs MCP at `https://docs.marfa.so/mcp` (or use `marfa docs search "<query>"` from CLI) before re-deriving from source. This repo is the canonical home for all published Marfa docs — code repos never author docs pages; they open companion PRs here when they change a public surface.

## Framework

- **Fumadocs UI** on **TanStack Start** — TypeScript ESM, Vite-driven, no Next.js dependency.
- **`source.config.ts`** — Fumadocs MDX configuration; content lives under `content/docs/`.
- **`meta.json`** files per folder configure sidebar grouping + ordering.
- **OpenAPI** — `openapi.json` at repo root drives the API reference. Sync from the monorepo via `scripts/sync-openapi.sh`.

## Build and preview

```bash
pnpm install        # Node 22+
pnpm dev            # http://localhost:3000
pnpm build          # vite build (full prerender)
pnpm types:check    # fumadocs-mdx codegen + tsc --noEmit (run after a build)
pnpm test           # vitest run — MCP protocol conformance
pnpm preview        # serve the production build locally
pnpm run deploy     # pnpm build && wrangler deploy (pnpm deploy is a built-in)
```

## Publishing

**Merging to `main` publishes the site.** The `Publish` workflow runs once CI has
passed on `main`, builds the commit CI passed on, deploys it, and then fetches
`/version.json` from the live site to confirm the deploy actually took. A deploy
that returns zero is not proof that readers were served the new bundle.

`/version.json` reports the commit the running bundle was built from, which
makes "is my change live?" a fetch rather than a comparison of published prose
against the repository. A build from a modified working tree reports
`<sha>-dirty`, because a hand-deploy that stamped a clean sha would defeat every
check downstream of it.

A daily run compares the live commit against `main` and names the unpublished
commits if it has fallen behind. Both paths report to the alerting service, and
both can be run by hand from the Actions tab, the check path included.

**This exists because none of it did.** Publishing was `pnpm run deploy` from
somebody's shell with nothing reporting that nobody had run it, and the site
reached fifteen merged commits behind while every run on `main` was green.
`pnpm run deploy` still works and is the fallback if the credential is ever
missing, but it should not be the normal path.

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

Hierarchy lives in `meta.json` files per folder; each defines `title`, `pages` (an ordered list of slugs), and `root: true` on the five top-level folders that become navbar tabs. The tabs render across a top navbar (Fumadocs notebook layout, `nav.mode: 'top'` plus `tabMode: 'navbar'`); each swaps the sidebar to its own tree. The five tabs:

- **Introduction** — overview, two quickstarts (hosted and self-hosted), and the docs MCP page.
- **Guides** — sub-grouped: Core model, Schema & types, Identity & spaces, Querying & data, Realtime & events, Connections & integrations, Operations.
- **API reference** — OpenAPI-driven, with a hand-written General section (Overview, Authentication, Permissions, Errors, Rate limits) above the generated resource sections; see `src/lib/api-reference-tree.ts`.
- **SDKs**.
- **Self-hosting** — a section overview landing, then sub-grouped: Run, Operate.

Adding a page: drop the `.mdx` file in the right folder, register it in the folder's `meta.json`. No central manifest.

## OpenAPI sync

```bash
./scripts/sync-openapi.sh
```

Expects the monorepo at `../marfa`. Override with `MARFA_ROOT=/path/to/marfa scripts/sync-openapi.sh`. Run after any API change merges in the monorepo. The monorepo also pushes the spec here automatically, as a PR, whenever it changes on its main branch; the script is the manual path for when you need the update in hand.

Two checks guard the committed copy, in two places.

The `OpenAPI spec` workflow here validates that `openapi.json` parses and declares paths, which catches a sync that truncated the file or contaminated it with shell output before the broken spec reaches the published reference.

Whether the file is the *current* spec is answered in the monorepo, by its own `OpenAPI drift` workflow. The comparison has to read both repositories, a workflow's built-in token reaches only its own, and the monorepo already holds a credential that reaches this one for the sync. It runs daily rather than on push, because the sync arrives as a pull request and the two copies legitimately differ until that PR merges.

The spec is generated with the server in keys mode, so hosted-only routes are absent from it by construction. That gap is closed in the monorepo's generator, never by hand-editing the file here.

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
- `docs_list_topics()` — every page as a flat list

BM25-only at launch (Worker bundle-size constraint on dense embeddings; upgrade path is Workers AI bge-small or an external vector index). No auth — public docs are public.

The protocol comes from `@modelcontextprotocol/server`, not from hand-written JSON-RPC. `src/lib/mcp/tools.ts` defines the tools once; the HTTP route and the stdio bridge both mount that definition, so the two transports cannot advertise different surfaces. Serving covers the current 2026-07-28 revision and the earlier handshake revisions, statelessly in both cases.

`src/lib/mcp/server.test.ts` is a conformance suite asserting against the specification rather than against whatever the current clients tolerate. Add a case there before changing protocol-visible behavior; the previous hand-rolled handler drifted precisely because nothing tested it.

CLI bridge: `marfa docs search/get/list` in `@withmarfa/cli` wraps the MCP endpoint; `--docs-url` flag for self-hosters.

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

## Formatting standards

The anti-junk guardrail: the markup discipline every page holds to, and the rubric reviews enforce. The Principles govern content shape; the Style governs voice; these govern markup. A page can be on-voice and well-structured and still read as junk if it ignores them. They also govern the OpenAPI operation-description trim, since a spec description is a docs sentence and follows the same rules.

- **Headings are plain text.** No inline code, backticks, links, or other markup in a heading, not even a literal identifier. If a code token wants to live in the heading, rephrase so it sits in the body instead.
- **Inline code is for literal code only.** The test is location, not importance: backtick a token the reader would copy verbatim, including type ids, field names, env vars, paths, route fragments, header names, CLI flags, literal values, code symbols, and the like. A package or product name keeps its backticks inside a code block, command, or import (`pnpm add @withmarfa/sdk`); the same name in prose is plain text (the TypeScript SDK, Marfa, the API reference), never `@withmarfa/sdk` or `marfa`.
- **One page-opening pattern.** Frontmatter `title` and a one-line `description`, then straight into the first `##` section. The theme renders the description as the lead, so the body never repeats it as a paragraph and never opens with preamble or "in this guide".
- **Code blocks are for code.** A fenced block means runnable or copyable code. To make a note or a single value stand out, use a `<Callout>` or inline code, never a fence. (Choosing a scannable layout for a catalogue is Principle 4; this rule is only about not abusing a fence.)
- **Links carry their meaning.** Link text states where it goes, never "click here" or a bare pasted URL. Internal links are relative paths so the `.md`-twin and self-hosted instances resolve them, never absolute `docs.marfa.so` URLs.
- **Em-dash restraint.** At most one em-dash per sentence, and never two in one sentence doing different jobs. Use it for a parenthetical aside; use a colon to introduce, a comma to separate, a full stop to end. If a dash swaps for one of those with no loss, swap it.
- **No needless nesting.** Flat unless the hierarchy is load-bearing; more than two levels of in-page nesting needs a reason. Don't bury a list under a heading under an accordion under a tab when one flat section says it once.

## Deployment

`docs.marfa.so` is a Cloudflare Worker. `pnpm run deploy` runs `pnpm build && wrangler deploy` (use `run` — `pnpm deploy` is pnpm's own built-in and won't invoke the script). Custom domain wired in `wrangler.jsonc`. Account: `marfa` (set `CLOUDFLARE_API_TOKEN` to a marfa-account token before deploying).

## Conventions

This repo is open-source and cloned independently, so these are restated here.

- **American English** in code, comments, commits, and docs prose: color, organization, favorite.
- **Conventional Commits** with scope: `docs:`, `feat(mcp):`, `fix(api-ref):`. One logical change per PR. No references to AI tooling.
- **TypeScript ESM**, Prettier with single quotes.
- **No personal infrastructure** in committed files: no internal hostnames, private IPs, launchd labels, or vault paths.

## Comments

Comments are self-contained and make sense to anyone reading this repository cold. Explain *why* — the decision, constraint, or non-obvious trade-off — not the *what*, which the code already states. Never reference internal trackers, ticket numbers, or project phases; a comment that only points at external context is noise. If a comment doesn't earn its place by capturing intent, delete it — the code and its history carry the rest.
