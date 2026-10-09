# Marfa docs

The source of the public documentation site at `docs.marfa.so` and of the status page at `status.marfa.so`. Fumadocs on TanStack Start, deployed to Cloudflare Workers with `@cloudflare/vite-plugin`.

The docs follow the API description and the contract in `withmarfa/marfa`, and those are the source of truth. Check any Marfa name, field, error code or rule on a page against them before it ships. Generated reference reaches this repository through the sync script; hand-written pages are rewritten in a docs pass at each release, never patched for each code change (`STYLE.md`, "Keeping pages current").

Writing follows `STYLE.md`.

## Layout

- **Content** is under `content/docs/`, one folder per tab: `get-started/`, `guides/`, `tools/` and `api-reference/`. `changelog.mdx` sits at the root and is served at `/changelog`, outside every tab.
- **Pages** are `.mdx` files that start with YAML frontmatter holding a `title` and a `description`. Quote a description that begins with `@`, `:`, `>`, `|`, `*`, `&`, `?` or `%`. An optional `tocDepth` (2 to 6) limits the page's "On this page" list to headings at that level and above, for a page that includes a long generated reference (`source.config.ts`, applied in `src/routes/$.tsx`). `Card`, `Cards` and `Callout` are available in every page; import anything else from `fumadocs-ui/components/`.
- **Tabs and groups** are declared in `meta.json` files. A folder with `"root": true` is a tab, `"pages"` orders its entries, `"---Group---"` starts a labeled sidebar group and `"..."` stands for every page not listed. `content/docs/meta.json` orders the tabs. Adding a page means adding the file and listing it in its folder's `meta.json`.
- **`api-reference/`** holds only the hand-written index and Errors pages. Every operation page is generated from `openapi.json` by `src/lib/source.ts` and `src/lib/openapi.ts`, grouped by tag.
- **`src/components/section-nav.tsx`** draws the tabs as pills in the header. Its `SECTIONS` list is separate from the `meta.json` files, so a new tab or a renamed landing page needs both.
- **`src/lib/api-reference-tree.ts`** finds the API reference folder by its title in `meta.json` (`API reference`), then orders its tag groups as the API description lists them. Rename the folder's title and you must change `API_REFERENCE_TITLE` there.
- **`src/lib/layout.shared.tsx`** holds the header links, including Changelog and Contract. **`src/routes/$.tsx`** renders every page, and **`src/components/release-label.tsx`** is the release label in the sidebar footer.
- **`src/generated/`** is committed and written only by the sync script. Do not edit it by hand. A page shows a generated Markdown file with fumadocs-mdx's `<include cwd>src/generated/<file>.md</include>` (add `#<heading-id>` for one section, which ends at the next heading of any level), never with a component, so the page's Markdown copy and the docs MCP tools carry the same text as the HTML.

## Commands

```bash
pnpm install          # Node 22+; also generates .source/
pnpm dev              # http://localhost:3000
pnpm build            # the docs site, with a full prerender
pnpm build:status     # the status page, a second Vite target
pnpm types:check      # fumadocs-mdx, then tsc for each target
pnpm test             # vitest run
pnpm preview          # serve the production build
pnpm run deploy       # build and wrangler deploy (pnpm deploy is a built-in)
pnpm run deploy:status
pnpm mcp:stdio        # the docs MCP stdio bridge
```

Run `pnpm build` and `pnpm build:status` before `pnpm types:check`. Each build generates a route tree, and the two trees register their paths in one global interface, so type-checking without both builds leaves the other target's route types `undefined`. CI runs them in that order.

`pnpm test` includes the content lint, `src/lib/content-lint.test.ts`. It checks every page for em dashes (including `&mdash;`), the glossary's banned terms, a short docs-only list of avoided terms ("door"), cited contract statement numbers, a title and description, "coming soon" outside the two pages that may use it, and internal links that are not site-root paths or reach no page (a relative link or a `docs.marfa.so` link fails). Each rule has a test that proves it fires on a bad sample.

The lint also reads the text a page pulls in with `<include>`, resolved the way fumadocs-mdx resolves it (relative to the page, or to the repository root with `cwd`, and `#id` for one section), and reports a line in the included file's own numbering. Only two rules reach included text: em dashes (and their entities) and internal links. No other rule does: the banned and avoided terms in particular stay out of it, because the glossary names those words on purpose. An include the lint cannot resolve fails too.

## Syncing from marfa

```bash
MARFA_ROOT=/path/to/marfa scripts/sync-from-marfa.sh
```

`MARFA_ROOT` defaults to `../marfa`. Use a checkout on an up-to-date `main` with its tags fetched: the script copies committed files and runs nothing. It stops before it changes anything if the checkout has no spec, glossary, command reference, errors chapter or release tag, if the spec is not valid JSON or has no `info.description`, if the command reference holds nothing after its title, if the errors chapter has no code table between its markers, or if the instance chapter has no settings table between its markers. It writes seven things:

- `openapi.json`, which the monorepo's CI keeps current. Fix a gap in the monorepo's generator, never in this file.
- `src/generated/api-overview.md`, the spec's `info.description` (the rules every operation follows) with each heading one level lower, included by the API reference overview under its own heading.
- `src/generated/GLOSSARY.md`, which the content lint reads its banned terms from and the Glossary page includes.
- `src/generated/marfa-commands.md`, the monorepo's `core/marfa-cli/COMMANDS.md` (the `marfa` command's reference, generated from its own help) without its generated-file comment and its title, included by the marfa command page.
- `src/generated/error-codes.md`, the code table between the `errors-table` markers of the monorepo's `conformance/spec/errors.md`, which the monorepo generates from the server's own list of codes, included by the Errors page.
- `src/generated/settings.md`, the settings table between the `settings-table` markers of the monorepo's `conformance/spec/instance.md`, which the monorepo holds to the server's own settings schema, included by the Settings guide.
- `src/generated/marfa-release.json`, the latest `v` version tag, shown as "Marfa vX.Y.Z" in the sidebar.

`.github/scripts/sync-from-marfa.test.sh` runs it against throwaway checkouts and pins the overview, the command reference, the error codes and the settings it writes and every input it refuses. Run it after an API, glossary, command, error code, setting or release change lands in the monorepo.

The script takes only what the monorepo generates and commits as Markdown between markers or as a file of its own. The core types, the edge types, the twelve permissions and the event types have no such source yet, so no page includes a table of them: the pages link to the operation that lists them (`GET /types`, `GET /edge-types`) or to the page that explains them. Never copy such a list into a page by hand.

The `OpenAPI spec` workflow checks that the committed `openapi.json` parses and declares paths.

## Two Workers

The docs site is the default target. The status page in `src/status/` is the second, built by `vite.status.config.ts` into `dist-status/` and deployed from `wrangler.status.jsonc`. One `public/` directory feeds both, so the favicon set cannot differ.

**Never build both targets and then deploy in one tree.** The Cloudflare plugin writes one deploy pointer per project root and every build rewrites it, so a bare `wrangler deploy` deploys whichever target built last. `deploy:status` passes the config its own build emitted.

## CI and publishing

`CI` runs on every pull request and every push to `main`. A `Classify changes` job skips the build only for a change that touches nothing but agent instructions, the root README or LICENSE, `.agents/`, `.claude/`, `.codex/`, `.githooks/` or the issue and pull request templates (`.github/scripts/ci-changes.sh`). The `Build and type-check` job runs `pnpm build`, `pnpm build:status`, `pnpm types:check`, the shell tests in `.github/scripts/` and `pnpm test`. It is a required check, so never add `paths` filters to `ci.yml`: a filtered-out workflow leaves the check pending. `OpenAPI spec` is not required and runs only when `openapi.json` changes.

**Merging to `main` publishes.** `Publish` runs when `CI` completes successfully on `main`. Separate jobs build and deploy the docs site and the status page, each only if something its target builds from has changed since the commit it serves (`.github/scripts/read-live-commit.sh`; any uncertain case publishes). Each job then fetches `/version.json` from its live site and fails unless it reports the deployed commit. A build from a modified tree reports `<sha>-dirty`. Deploying needs the `CLOUDFLARE_API_TOKEN` secret and the `CLOUDFLARE_ACCOUNT_ID` variable.

`Publish` has no schedule. Run it by hand from the Actions tab with `mode` set to `check` to compare each live commit against `main`, or to `publish` to deploy; `target` limits it to `docs` or `status`. The status check also fails if the checker's store has not been written for three of its write intervals (`.github/scripts/check-store-freshness.sh`). Nothing reports a failure outside GitHub: a red run is the signal, whether a deploy did not take or a check found a site behind `main` or a stale store. `pnpm run deploy` from an authenticated shell is the fallback.

## Agent access

- **Markdown copy of each page.** Append `.md` to a page URL (`src/routes/{$}[.]md.ts`). Pages are prerendered and served as static assets, so the `.md` URL is the only way to ask for Markdown. A missing page answers 404. `/` is not prerendered: the Worker answers it with a 307 to `/get-started`, the What Marfa is page, whose copy is `/get-started.md`. There is no `/index.md`.
- **`/llms.txt`, `/llms-full.txt` and `/docs-map.md`.** An index, the whole corpus, and a map grouped by tab, from `src/routes/llms[.]txt.ts`, `llms-full[.]txt.ts` and `docs-map[.]md.ts`. The map orders the tabs in its `sectionOrder`.
- **One implementation of the docs tools.** `src/lib/docs-tools.ts` holds the search server, `searchDocs`, `fetchDocsPage`, `listTopics` and `pathToSlugs`, with no MCP types. The MCP server, the JSON addresses and the site's search box (`/api/search`) all use it, so change behavior there.
- **The docs MCP server at `/mcp`.** `src/routes/mcp.ts` passes requests to `server.ts` in `src/lib/mcp/`, and `tools.ts` adapts the three tools over `docs-tools.ts`: `docs_search`, `docs_fetch` and `docs_list_topics`. `stdio.ts` is a bridge that forwards a stdio client to the HTTP endpoint (`MARFA_DOCS_URL`), so it cannot differ from it. `server.test.ts` checks the server against the MCP specification; add a case there before changing protocol-visible behavior.
- **JSON addresses for clients with no MCP.** `GET /api/docs/search?q=<query>&limit=<1 to 50, default 10>` answers `{ "hits": [{ "title", "url", "snippets" }] }` with one hit per page and no highlight markup (a snippet keeps the page's inline code backticks), and a blank `q` or a bad `limit` answers 400 `{ "error", "message" }`. `GET /api/docs/topics` answers `{ "pages": [{ "title", "url", "description", "breadcrumbs" }] }`. The handlers are in `src/lib/docs-api.ts`, called by `src/routes/api/docs/`. There is no page route: fetch `/<path>.md`. The `marfa docs` command in withmarfa/marfa reads these two addresses and the `.md` copies, so a change to their shapes or status codes needs a matching change there.

When a page's path or title changes, check what these surfaces say about it, including the example paths in the `docs_fetch` description.

## Analytics

Both Workers report page views and unhandled errors to one PostHog project, and nothing else. `src/lib/analytics.ts` writes out every option. Autocapture, session replay, surveys, heatmaps, dead clicks, web experiments, feature flags and all storage are off, so neither site needs a consent banner.

The SDK loads by dynamic import after hydration, so it never sits on the critical path and the status page can still render when other things fail. Two rules keep that true:

- Nothing outside `src/components/analytics.tsx` may import `posthog-js` as a value. A type-only import is fine. Error components report through `reportError` in `src/lib/analytics.ts`.
- After changing any of this, check that no SDK code appears in either client entry chunk and that a separate chunk carries it.

The key arrives at build time as `MARFA_POSTHOG_KEY`, from a repository variable. It is write-only and ships in the bundle, so what matters is that it is not committed. A missing key is a working state: the component loads nothing and the bundle omits the SDK.

## Conventions

- American English in code, comments, commits and docs.
- Conventional Commits with a scope, such as `docs(guides):` or `fix(mcp):`. One logical change per pull request, and work reaches `main` only through a pull request.
- TypeScript, ESM.
- No personal infrastructure in committed files: no internal hostnames, private IP addresses or personal paths.
- A comment says only what the code cannot: the reason, the constraint or the trade-off. Never refer to a tracker, ticket number or project phase.
