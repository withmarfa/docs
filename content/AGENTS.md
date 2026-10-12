# Pages

How pages are placed and wired into the site. `STYLE.md` at the repository root says how they are written, and the root `AGENTS.md` still applies.

This file sits above `content/docs/` on purpose: the docs collection publishes every `.md` and `.mdx` file inside it.

## Placing a page

- Each folder under `content/docs/` is a tab. `(overview)/` and `(tools)/` are folder groups, so their pages sit at the site root (`/files`, `/cli/items`). `guides/` and `api-reference/` keep their names in the URL.
- A new page needs its file and an entry in its folder's `meta.json`. `content/docs/meta.json` orders the tabs.
- A slug in `(overview)/` or `(tools)/` must not repeat a slug in either group. It must not be a name the Worker answers at the root (`api`, `mcp`, `llms`, `llms-full`, `docs-map`, `version`), or `docs`, which the docs tools strip as a prefix.
- The header tabs come from `SECTIONS` in `src/components/section-nav.tsx`, not from `meta.json`. A new tab or a renamed landing page needs both. A new Tools page needs only its entry in `(tools)/meta.json`, which the header reads.
- The header holds no text links. The Changelog and the contract sit in the Tools tab's Resources group, so a new destination goes in a sidebar group, not in `links` in `src/lib/layout.shared.tsx`.
- `src/lib/api-reference-tree.ts` finds the API reference tab by its `meta.json` title. Renaming that title needs `API_REFERENCE_TITLE` changed there.
- `api-reference/` holds only the hand-written overview and Errors pages. Every operation page is generated from `openapi.json`.
- When a page's path or title changes, check what the agent surfaces say about it, including the example path in the `docs_fetch` description in `src/lib/mcp/tools.ts`.

## Wiring a page

- Frontmatter holds a `title` and a `description` (`STYLE.md`, "Frontmatter"). An optional `tocDepth` from 2 to 6 limits the "On this page" list, for a page that includes a long generated reference.
- A page uses what `src/components/mdx.tsx` registers without importing it. Import anything else from `fumadocs-ui/components/`.
- Show a generated file with `<include cwd>src/generated/<file>.md</include>`, and add `#<heading-id>` for one section, which ends at the next heading of any level. Never copy generated text into a page or show it through a component: the include keeps the Markdown copy and the docs tools in step with the HTML.
- `pnpm test` runs the content lint (`src/lib/content-lint.test.ts`) over every page and the text it includes, and a test that each file in `src/generated/cli/` is on exactly one page. Passing them is not the same as following `STYLE.md`.

## Code Review Rules

- **Page not wired.** Flag a page missing from its `meta.json`, a root slug that collides, or a tab change without a matching `SECTIONS` entry.
- **Generated text copied.** Flag a generated table, CLI section or install step written into a page instead of included.
- **Lost in the Markdown copy.** Flag a component a page relies on that `source.config.ts` leaves out of the copy (`STYLE.md`, "Components").
