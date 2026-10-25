# Pages

How pages are placed and wired into the site. `STYLE.md` at the repository root says how they are written, and the root `AGENTS.md` still applies.

This file sits above `content/docs/` on purpose: the docs collection publishes every `.md` and `.mdx` file inside it.

## Placing a page

- Each folder directly under `content/docs/` is a tab. `(overview)/` and `(reference)/` are folder groups, so their pages sit at the site root (`/files`, `/cli`). `guides/` and `catalog/` keep their names in the URL, and so does `(reference)/api-reference/`. The Catalog tab's Types pages sit in a folder group, `catalog/(types)/`, which the sidebar shows as a closed folder named Types. Its own page is `types.mdx` (`pagesIndex` in its `meta.json`, so the folder opens on `/catalog/types`), and it holds Type rules and Field kinds and two more folder groups, `(core)/` and `(system)/`, shown as closed folders, "Core types" and "System types". No group adds to an address: a type page stays at `/catalog/note`.
- A new page needs its file and an entry in its folder's `meta.json`. `content/docs/meta.json` orders the tabs.
- A slug in `(overview)/` or `(reference)/` must not repeat a slug in either group. It must not be a name the Worker answers at the root (`api`, `assets`, `mcp`, `llms`, `llms-full`, `docs-map`, `version`), or `docs`, which the docs tools strip as a prefix.
- The Catalog tab lists names and shapes and explains nothing. Each top-level type, core or system, has a page (`src/lib/catalog.test.ts` holds them to `src/generated/catalog/builtin-catalog.json`) that takes its title and description from the type and includes the type's generated file. A core type's page ends with one `## Example` item that the test checks; Marfa writes system items itself, so their pages have none. Add a type's page, in the folder of its family and in that folder's `meta.json`, when marfa ships a type, and leave explanation to the Overview and the Guides. Include `catalog/edge-types.md`, `permissions.md` and `event-types.md` on Catalog pages only; every other page links to the Catalog page.
- The header tabs come from `SECTIONS` in `src/components/section-nav.tsx`, not from `meta.json`. A new tab or a renamed landing page needs both. The Reference tab opens on `(reference)/reference.mdx` (`/reference`), the first entry in `(reference)/meta.json`, with a card for each destination below it. A new Reference page needs its entry in `(reference)/meta.json`, which the header reads, and a card there when it is a new kind of destination.
- The header holds no text links. The Changelog and the contract sit in the Reference tab's Resources group, so a new destination goes in a sidebar group, not in `links` in `src/lib/layout.shared.tsx`.
- The Reference tab's `meta.json` lifts the API pages into its own sidebar with `...api-reference`, and `src/lib/api-reference-tree.ts` finds the tab by that `meta.json` title. Renaming the title needs `REFERENCE_TITLE` changed there.
- `(reference)/api-reference/` holds only the hand-written overview and Errors pages. Every operation page is generated from `openapi.json`, into the folder `src/lib/source.ts` names.
- An operation page sits at `/api-reference/<group>/<operationId>`, where the group is its tag in lowercase with hyphens for spaces (`/api-reference/api-keys/createKey`). The sidebar and `docs-map.md` list the groups in the order of `tags` in `openapi.json` and each group's operations in that tag's `x-operation-order`; an operation missing from the list sorts last and fails `src/lib/api-reference-tree.test.ts`. A link to an operation page uses that address, and `src/lib/content-lint.test.ts` finds one that does not resolve.
- When a page's path or title changes, check what the agent surfaces say about it, including the example path in the `docs_fetch` description in `src/lib/mcp/tools.ts`.

## Wiring a page

- Frontmatter holds a `title` and a `description` (`STYLE.md`, "Frontmatter"). A Catalog type page also holds `identifier`, the type's ID, which the page header and the Markdown copy show.
- A page uses what `src/components/mdx.tsx` registers without importing it. Import anything else from `fumadocs-ui/components/`.
- Show a generated file with `<include cwd>src/generated/<file>.md</include>`, and add `#<heading-id>` for one section, which ends at the next heading of any level. Never copy generated text into a page or show it through a component: the include keeps the Markdown copy and the docs tools in step with the HTML.
- `pnpm test` runs the content lint (`src/lib/content-lint.test.ts`) over every page and the text it includes, and a test that the CLI page is the one page that includes `src/generated/cli/`. Passing them is not the same as following `STYLE.md`.

## Code Review Rules

- **Page not wired.** Flag a page missing from its `meta.json`, a root slug that collides, or a tab change without a matching `SECTIONS` entry.
- **Generated text copied.** Flag a generated table, CLI section or install step written into a page instead of included.
- **Lost in the Markdown copy.** Flag a component a page relies on that `source.config.ts` leaves out of the copy (`STYLE.md`, "Components").
