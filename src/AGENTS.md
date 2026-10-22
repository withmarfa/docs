# Site code

The code of the docs site and the status page. The root `AGENTS.md` still applies.

## Agent surfaces

- `src/lib/docs-tools.ts` is the one implementation of docs search, page fetch and the topic list. The MCP server (`src/lib/mcp/`), the JSON addresses (`src/lib/docs-api.ts`) and the site's search box (`/api/search`) all call it. Change behavior there, never in one caller.
- `src/lib/mcp/server.test.ts` checks the MCP server against the MCP specification. Add a case there before changing anything a client can see. `src/lib/mcp/stdio.ts` only forwards to the HTTP endpoint, so it cannot differ from it.
- The `marfa docs` command in withmarfa/marfa reads `/api/docs/search`, `/api/docs/topics` and the `.md` copies. A change to their shapes or status codes needs a matching change there.
- `/` is not prerendered: the Worker redirects it to `/overview`. Prerender starts at `/overview`, and its filter in `vite.config.ts` drops `/`, `/version.json`, `/mcp` and `/api/`. A prerendered `/` breaks hydration, and a prerendered Worker route answers from a frozen file.
- `source.config.ts` decides what each component becomes in the Markdown copy that `.md`, `llms-full.txt` and the docs tools serve (`STYLE.md`, "Components").

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
- `src/lib/command-check.ts` holds the command check and `command-check.test.ts` runs it over every page. Its exceptions are in `src/lib/command-check-allowlist.json`, each with a reason; add one only for what is not a `marfa` command or option, and fix a page that names one that does not exist.

## Code Review Rules

- **Second implementation.** Flag docs search, fetch or topic logic outside `src/lib/docs-tools.ts`.
- **`marfa docs` broken.** Flag a change to the JSON addresses' shapes or status codes, or to the `.md` copies, without the matching change in withmarfa/marfa.
- **Protocol change untested.** Flag a change to what an MCP client sees without a case in `src/lib/mcp/server.test.ts`.
- **Analytics grown.** Flag a value import of `posthog-js` outside `src/components/analytics.tsx`, or an option that turns on capture, replay, flags or storage.
- **Alias in the status build.** Flag an `@/` import that code under `src/status/` can reach.
