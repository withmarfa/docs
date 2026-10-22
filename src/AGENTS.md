# Site code

The code of the docs site and the status page. The root `AGENTS.md` still applies.

## Agent surfaces

- `src/lib/docs-tools.ts` is the one implementation of docs search, page fetch and the topic list. The MCP server (`src/lib/mcp/`), the JSON addresses (`src/lib/docs-api.ts`) and the site's search box (`/api/search`) all call it. Change behavior there, never in one caller.
- `src/lib/mcp/server.test.ts` checks the MCP server against the MCP specification. Add a case there before changing anything a client can see. `src/lib/mcp/stdio.ts` only forwards to the HTTP endpoint, so it cannot differ from it.
- The `marfa docs` command in withmarfa/marfa reads `/api/docs/search`, `/api/docs/topics` and the `.md` copies. A change to their shapes or status codes needs a matching change there.
- `/` is not prerendered: the Worker redirects it to `/overview`. Prerender starts at `/overview`, and its filter in `vite.config.ts` drops `/`, `/version.json`, `/mcp` and `/api/`. A prerendered `/` breaks hydration, and a prerendered Worker route answers from a frozen file.
- `source.config.ts` decides what each component becomes in the Markdown copy that `.md`, `llms-full.txt`, a page address that asks for Markdown and the docs tools serve (`STYLE.md`, "Components").
- `llms-full.txt` holds the written pages: `inLlmsFull` in `src/lib/source.ts` leaves out the generated operation pages and the changelog, and the opening of `llms.txt` (`src/lib/docs-map.ts`) says so and says where they are. Change the three together.

## Worker entry

- `src/server.ts` is the Worker's one entry (`main` in `wrangler.jsonc`). It runs the stages in `src/lib/worker.ts`, then the router. A new request-level behavior is a stage there, one line in `createWorkerHandler`, with a case in `src/lib/worker.test.ts`.
- Prerendered pages are static files, and a static file answers before any Worker runs. `run_worker_first` in `wrangler.jsonc` runs the Worker first for every address except the hashed files in `/assets/` and the icons, and the `staticAssets` stage hands the request to the files itself. Without it a page address never sees its `Accept` header. A page slug must not be `assets` (`content/AGENTS.md`).
- A page address whose `Accept` ranks `text/markdown` above `text/html`, or at the same rank when it names `text/markdown` first, answers the page's Markdown copy, and every answer for a page address carries `Vary: Accept`. `src/lib/accept.ts` decides the ranking. The `.md` route and the negotiated answer both build their response with `markdownResponse`, so the two cannot differ.
- `pnpm dev` renders every page through the router, because nothing is prerendered there, so it cannot show the file lookup or `run_worker_first`. Check a change to either with `pnpm build` and `pnpm exec vite preview`, which runs the built Worker as it deploys.

## Analytics

- Both Workers send page views and unhandled errors to one PostHog project, and nothing else. `src/lib/analytics.ts` sets every option: autocapture, session replay, surveys, heatmaps, feature flags and all storage stay off, so neither site needs a consent banner.
- Only `src/components/analytics.tsx` imports `posthog-js` as a value, by dynamic import after hydration, so the SDK never sits on the critical path. A type-only import is fine. Error components report through `reportError` in `src/lib/analytics.ts`.
- After changing analytics, build both targets and check that no SDK code is in either client entry chunk and that a separate chunk carries it.
- A build without `MARFA_POSTHOG_KEY` is a working state: it loads nothing and reports nowhere.

## Status page

- `src/status/` reads the store that a separate checker writes, and never writes to it. It is not prerendered, because it answers from the store at request time.
- The status build has no `@/` alias. Code under `src/status/`, and any shared module it imports, such as `src/components/analytics.tsx` and `src/lib/analytics.ts`, uses relative imports.

## Tests

- Tests sit beside the code as `*.test.ts` or `*.test.tsx`. Each content lint rule has a test that proves it fires on a bad sample; give a new rule one.

## Code Review Rules

- **Second implementation.** Flag docs search, fetch or topic logic outside `src/lib/docs-tools.ts`.
- **`marfa docs` broken.** Flag a change to the JSON addresses' shapes or status codes, or to the `.md` copies, without the matching change in withmarfa/marfa.
- **Protocol change untested.** Flag a change to what an MCP client sees without a case in `src/lib/mcp/server.test.ts`.
- **Worker bypassed.** Flag a change to `run_worker_first` that lets a page address answer from its file without the Worker, `Accept` read anywhere but `src/lib/worker.ts`, or a response for a page address without `Vary: Accept`.
- **Analytics grown.** Flag a value import of `posthog-js` outside `src/components/analytics.tsx`, or an option that turns on capture, replay, flags or storage.
- **Alias in the status build.** Flag an `@/` import that code under `src/status/` can reach.
