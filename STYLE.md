# Writing the Marfa docs

How every page on docs.marfa.so is written. Read it before you write a page. Passing `pnpm test` isn't the same as following this file.

## Standards

- **Prose:** the [Google developer documentation style guide](https://developers.google.com/style), which decides where this file is silent.
- **Structure:** [Diátaxis](https://diataxis.fr/). Each page is one kind of page.
- **Spelling:** American English: color, organization, canceled.

## Who reads the docs

Write for someone new to Marfa. Start and Use must make sense to a reader who doesn't know software.

- **Someone finding out what Marfa is, or starting it,** reads Start.
- **Someone using Marfa every day** reads Use, and Run when they look after their own instance.
- **Someone building on Marfa,** a connector author included, reads Build, then Catalog and Reference.

**Never bury a user in technical detail, and always give a builder the exact reference.** Use and Run never need HTTP.

**Agents read the docs most,** as Markdown, usually for one of these people. A page a newcomer can follow serves an agent too. Never write that Marfa is only for technical people.

## What Marfa is

- **Marfa is the home for everything a person keeps, files first.** It isn't a notes, tasks or bookmarks app, and no page's examples may make it sound like one.
- **The docs cover Marfa itself:** the instance, the CLI, MCP for agents, synced folders, the API, the SDKs and connectors. Apps built on Marfa, such as MAPP, aren't documented; a page may say where one is found, and nothing more.
- **The docs cover working with Marfa, not maintaining it.** How Marfa is built inside, such as its modules or storage, belongs in the marfa repository.

## Where a page goes

| Tab | What it holds |
| --- | --- |
| Start | What Marfa is, on the home page; the Quickstart; Connect your agent; How Marfa works, with no HTTP |
| Use | Everyday jobs: agents, the CLI, synced folders, connectors, access and keys, Limits |
| Run | Looking after an instance: where it runs, its address, sign-in, settings, health, backups, upgrades, telemetry, troubleshooting |
| Build | Concepts at full depth, then tutorials and guides for apps, types, working copies and connectors |
| Catalog | What Marfa ships, generated from the code: types, edge types, events, permissions, connectors |
| Reference | The HTTP API and errors, the SDKs, the CLI, the MCP servers, folder rules, settings, the contract |

- **Every address starts with its tab's segment,** such as `/use/sync-a-folder`, except the home page, `/`, and the top-bar pages: the Glossary, the Changelog and Get help.
- **No tab or group has a landing page,** and no page is a grid of cards that repeats the sidebar.
- **Say each thing once, and link to it.** Use and Run say what to do; Build explains why.
- **The Catalog lists what Marfa ships and explains nothing.** A page that needs one of its lists links to it.

`content/AGENTS.md` says how to add a page and wire it in.

## Page types

| Kind | What goes in | What goes elsewhere |
| --- | --- | --- |
| Tutorial | **You'll build**, **You need** and **You'll have**, each true; then steps, the code each adds and a check that each worked | Options to a how-to; a refusal to a fix page, unless it is the lesson |
| How-to | One job, what the reader needs in one line, the everyday steps | Explanation to a concept, options to the reference, errors to a fix page, another vendor's rules to its help |
| Fix page | Entries headed by the exact text the reader sees: the cause in a sentence, the fix in a step | Rare messages and error codes to Errors |
| Concept | One idea: what it is, why it works this way, the rules met in normal use, one example | Lists to the Catalog, numbers to the reference, steps to a how-to |
| Reference | Tables, generated where possible, with a line of prose at most for each entry | Teaching and order |
| Catalog | Generated tables, one example for a core type; a connector page adds only "What goes back" and "What to know" | Everything that explains |

- **One page, one job.** The `job` line names one job, with no "and" or "or" joining two. A page with two jobs is two pages.
- **A ceiling is a limit, not a target.** Cut before you add. A page past its ceiling is usually two pages, or holds detail that belongs in the reference.
- **Ask of each section which part of the job it serves,** and cut or move one that serves none.
- **Give a page more room only when it can't be split,** with its reason in `page-limits.json`.

## Writing a page

Four rules decide most pages:

- **Write for this reader, doing this job, now.** Cut a sentence the reader doesn't need at this point, however true, and link to where they will need it.
- **Use words the reader knows,** or explain each in plain words where it first appears on the page. A Glossary link doesn't replace that line.
- **Output only proves the step.** Show the lines that prove a step worked. Never write a sentence only to explain confusing output: open an issue on withmarfa/marfa to change the message.
- **Files first.** Where a page covers both, answer for an ordinary file, such as a PDF, a photo or a spreadsheet, before a note.

And:

- **The everyday path comes first.** Error cases, rare choices and recovery go in their own section or page, linked from the step.
- **Answer first.** The `description` is the lead under the title; the first paragraph adds what it can't. Never restate it, or open with "This page explains".
- **Keep paragraphs to one idea,** in one to three sentences.
- **Describe the present:** no history, no "now" or "new".
- **Bold the few words a skimmer must not miss,** and the lead-in of each item in a scanned list. Never bold a whole sentence.
- **Use a list for parallel items.** Never open a page with one, except a tutorial's opening lines, and never let one stand in for an explanation.
- **Use a table to compare or to look up,** with short cells and headers that read as labels, because at phone width each cell shows under its header. Never turn a table into a list.
- **Keep headings plain text,** with no code or links.
- **Cut filler:** simply, just, easy, basically, really, actually, very.

## Naming

- **A title is the words a reader would type,** such as "Upgrade an instance". A concept or reference page takes its subject's name.
- **A title stands alone in search,** without its tab or group. Name the object: "Manage keys for scripts and agents", not "Manage keys".
- **A sidebar label may lean on its group heading, but must be true on its own.** Set `sidebar_label` only when the title wraps. Name a page from its steps, not its first sentence.
- **A `description` says what the page gives the reader,** not what it contains.
- **Add a `headTitle`,** the name in browser tabs and search, when the title is shared or doesn't name the page outside the site.

## Vocabulary

Marfa's `GLOSSARY.md`, synced as `src/generated/GLOSSARY.md`, decides every term and its sense. Link to `/glossary` rather than redefine a term; if the glossary doesn't settle one, ask the owners of the contract.

- **The CLI** is the `marfa` program; **a command** is one of its commands, such as `marfa items list`.
- **An operation** is one thing the API does.
- **A folder is on the instance; a directory is on disk.** The first time a page needs both, say so in one line: "The folder lives on your instance; the directory is where its files sit on this computer."
- **The bin** is where a deleted item goes, and **move to the bin** is the act. Use `trash` only in a literal name, such as `trashed`.

## Truth

- **Check every claim against withmarfa/marfa:** each name, field, error code, rule and sample value, against the contract (`conformance/spec/`), `openapi.json` and the code. If they disagree, don't choose: raise it with the owners of the contract.
- **Run a command for real, on a test instance, where a wrong step can lose data,** such as deleting, restoring, upgrading or changing a synced folder.
- **Link the contract chapter a page draws on,** and an exact rule by its heading, which is its ID.
- **Don't restate the API reference.** Explain how the pieces fit, the order and the reason, then link to the operation.
- **Never edit `src/generated/` or `openapi.json`.** Fix the source in marfa and run the sync.

## Examples

- **Show the smallest real example that makes the point,** with real names and values, and the response when it teaches something.
- **Examples work from any computer with a key, or the browser.** Only claiming an instance and recovering the owner's password run on the server.
- **Choose clients for the reader.** Use and Run show the CLI, with HTTP only where needed; a connector guide shows TypeScript and HTTP.
- **Show one task in several clients as code tabs,** in the order CLI, HTTP, TypeScript, Swift, with `tab-group="client"`, and no tab for a client that lacks it.
- **A block holds only code a reader runs or copies.** A command and what it prints go in `<Terminal>`.
- **Write raw HTTP in `http` blocks** titled `Request` and `Response`.
- **Show the code a step adds,** not the whole file, and give a block a `title` when the reader needs to know where it goes.
- **Mark a block** that holds another tool's command `command-check="other-tool"`, and a deliberate wrong example `command-check="counterexample"`.

## Components

| Component | Use it for |
| --- | --- |
| `Steps` | An ordered procedure. Each step opens with a `###` heading |
| `Steps paged` | A tutorial. Keep its steps close in length, with the next steps in the last one |
| `Terminal` | A command and what it prints |
| `Accordion` | Entries opened one at a time, never a reference list |
| `Callout` | Only what must interrupt, such as a step that can't be undone (`type="warn"`). Its `title` says what happens |
| `Cards` | Where to go next, never an index |

- **Write an object's fields as a Markdown table** (field, type, description).
- **Agents read the Markdown copy,** which `source.config.ts` writes. It leaves out a component it doesn't handle, so add one there before a page relies on it.

## Diagrams

- **A diagram earns its place by showing what prose can't.** Most pages need none, and a table often suits a comparison.
- **Draw a real example, not a category:** a beach photo attached to a packing list, not boxes named "Items".
- **Choose the form:** a `Figure` for a shape, with arrows that say what moves or links, never a list of boxes; a `Sequence` for order in time; an interactive figure only when exploring cause and effect is the point.
- **Every diagram has a text form.** The prose carries every fact, and the sentence before a figure states the fact it shows. A static figure takes a `label`, a sentence or two that the Markdown copy and screen readers read, which counts toward the page's words.
- **Use the theme tokens,** `--color-fd-*` and `--marfa-diagram-accent`, with no images or hard-coded colors. The accent marks the one thing the page is about.
- **Fit 375 px** with no sideways scroll, and labels of a few words.
- **Build controls only from `Controls`, `Choices` and `Menu`** in `src/components/visuals/interactive.tsx`. A choice changes the highlight and the text, never a size or the layout, and works by keyboard.

## Keeping pages current

- **Rewrite whole, never append.** Rewrite the sentence or section so it reads as if it had always been that way.
- **A code change opens a docs issue,** and the docs agent rewrites pages from the issues: the root `AGENTS.md`, "Docs pass at each release".

## What the tests enforce

The tests hold the numbers and the details.

- **Word ceilings, caps, kinds, budgets, `pending`, job lines, title and description lengths:** `src/lib/page-limits.ts` and `page-limits.json`.
- **Frontmatter, em dashes, banned and avoided terms, statement numbers, connector counts, "coming soon", callout titles, tutorial steps, links and includes:** `src/lib/content-lint.test.ts`.
- **Commands, options, markers and the allowlist:** `src/lib/command-check.test.ts`.
- **The Glossary page against `GLOSSARY.md`:** `src/lib/glossary.test.ts`.
- **Generated files included only where they belong:** `src/lib/docs-structure.test.ts`.
- **Unique head titles:** `src/lib/page-head.test.ts`. **Core type examples:** `src/lib/catalog.test.ts`.
- **Addresses under their tab's segment:** `pnpm test`.
