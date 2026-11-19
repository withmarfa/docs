# Writing the Marfa docs

How every page on this site is written. This file is the one place the writing rules live. The content lint checks the rules a machine can check; passing it isn't the same as following this file.

## Standards

- **Prose** follows the [Google developer documentation style guide](https://developers.google.com/style). Where this file is silent, that guide decides.
- **Structure** follows [Diátaxis](https://diataxis.fr/): each page is one kind of page, and the kinds stay apart.
- **Spelling** is American English: color, organization, canceled.

## Who reads the docs

Write for a reader who is new to Marfa. Most know software; some don't, and more of them will as apps built on Marfa reach people. Start and Use must make sense to both. Three readers come, and each has a front door:

1. **Someone working out what Marfa is, or starting it,** reads Start: what Marfa is, the Quickstart, Connect your agent and Ideas in Marfa.
2. **Someone using Marfa every day** reads Use, and Run when they look after their own instance.
3. **Someone building on Marfa** reads Build, then looks things up in Reference. A **connector author** is one of them.

**A user is never buried in technical detail, and a builder always finds the exact reference.** Use and Run never need HTTP; Build and Reference give the full rules.

**Agents are the most frequent readers.** An agent usually works for one of these people, and reads the same pages as Markdown, through the docs MCP server, `marfa docs` or `llms.txt`. A page that a newcomer can follow serves an agent too. Never write that Marfa is only for technical people.

## What the docs cover

- **Marfa is the home for everything a person keeps, files first.** Lead with files and images, and keep examples varied. Never frame Marfa as a notes, tasks or bookmarks app, and never let a page's examples make it sound like one.
- **The docs cover Marfa itself:** the instance, the CLI, MCP for agents, synced folders, the API, the SDKs and connectors. Apps built on Marfa, such as MAPP, aren't documented here. A page may say where an app is found, and nothing more.
- **The docs are for working with Marfa, not for maintaining it.** A page says what a reader meets when they run, use or build on Marfa. How Marfa is built inside, such as its modules, its internal jobs or how the server stores something, belongs in the marfa repository, not on a page.

## Where a page goes

The tabs follow what a reader comes to do, in this order:

| Tab | What it holds | Kind of page |
| --- | --- | --- |
| Start | What Marfa is, at `/`; the Quickstart, from `marfa server install` or Railway to an agent connected and a first item saved and found; Connect your agent; Ideas in Marfa, the few ideas everyone meets, with no HTTP | Explanation, tutorial, how-to |
| Use | The everyday jobs: working from an agent, Claude or ChatGPT and the CLI; a synced folder from set-up to a second computer; connectors; seeing and cutting access; Limits | How-to |
| Run | Looking after an instance: where it runs and its address, sign-in, settings, keys and apps, backups, upgrades, telemetry and Troubleshooting | How-to |
| Build | The concepts at full depth, then the tutorials and guides for apps, agents, working copies and connectors | Explanation, tutorial, how-to |
| Catalog | What Marfa ships, generated from the code: items, types, edge types, events, permissions and connectors | Reference |
| Reference | The HTTP API and Errors, the SDKs, the CLI and MCP pages and the contract | Reference |

The Glossary, the Changelog and Get help are not in a tab: they are links in the top bar, and in the phone menu.

**No tab has a landing page.** A tab's header link opens the first page in its sidebar, and no page is a grid of cards that repeats the sidebar.

Each thing is said once, with links between. Use and Run say what to do; Build explains why it works that way. **The Catalog lists exactly what Marfa ships and explains nothing:** a page that needs a list it holds, such as the types, edge types, permissions, events, field kinds or reserved names, links to the Catalog page instead of restating it.

## Page types

Each page is one type, and the type sets what it holds and how long it may be. **A ceiling is not a target:** `pnpm test` fails a page over it. Words are prose words: what a reader reads, including the text in a component's attributes, such as a `Card` `description` or a `Callout` `title`. Code, frontmatter, MDX markup and generated tables don't count, so code has caps of its own (below). `src/lib/page-limits.ts` says exactly how a page is measured.

| Type | What goes in | What goes out, and where it goes instead | Ceiling |
| --- | --- | --- | --- |
| Tutorial | Three opening lines in a list (**You'll build**, **You need**, **You'll have**), each true of the page, then at most seven steps, the code each step adds and one check that each step worked | Alternatives and options go to a how-to. A refusal goes to a fix page, unless showing it is the lesson. Output is cut to the lines that prove a step worked | 800 words, 12 code blocks |
| How-to | One job, what the reader needs in one line, then the everyday steps | Explanation goes to a concept page. Every option goes to the reference. Error cases go to a fix page. Another vendor's plan rules become a link to that vendor's help | 600 words, 6 code blocks, 6 H2 headings |
| Fix page | Entries headed by the exact text the reader sees, each with the cause in one sentence and the fix in one step | Rare messages, and codes the Errors page explains, stay on Errors and get a link | 600 words, 8 entries, 80 words and one code block an entry |
| Concept | One idea: what it is, why it works this way, the rules a reader meets in normal use, and one example | Lists go to the Catalog. Numbers and codes go to the reference. Steps go to a how-to | 500 words, 5 H2 headings, 2 code blocks |
| Reference | Tables, generated where Marfa generates them, with at most one line of prose for each entry | Teaching and order go to a how-to or a concept page | Its own, in `page-limits.json` |
| Catalog | Generated tables, and for a core type one example item. A connector page adds only "What goes back" and "What to know" | Everything that explains | 150 words for a type page, 200 for an edge page, 500 words and 4 code blocks for a connector page |

- **Terminals and code:** a `Terminal` holds at most 12 lines, its command and its output together, and 5 on a Start page. The command's own `--help` or the reference holds the full output. Except on a reference page, no code block runs past 25 lines, and a block with no language, or `text` or `md`, runs past 12 at most, because prose in a block is prose nobody counts. A concept page holds at most 2 code blocks.
- **A fix page's entries** are its H2 and H3 headings, each the text the reader sees; a deeper heading and its text belong to the entry above. A file named `fix-*` is a fix page.
- **Each page has a `job` line** in its frontmatter (see "Frontmatter").
- **A page that needs more than its ceiling is listed in `src/lib/page-limits.json`** under `pages`, with its budget and its reason. Add no entry for a page that you can split.
- **A page that is over a rule today is listed under `pending`** with its current numbers, until it is rewritten. It may not grow, and the test fails when the page falls below a ceiling, with the number to lower it to, or no longer needs its entry. A rewritten page leaves `pending`: it comes in within its ceiling, or is split or cut, never given a new entry.
- **The kind comes from the page.** A file named `fix-*` is a fix page; otherwise `kind` in the frontmatter (`concept`, `how-to`, `tutorial`, `fix`, `connector` or `reference`); otherwise the page's entry, or its folder's, in `page-limits.json`. A folder lists the kinds its pages may name (`kinds`), and a kind outside the list fails the page, a `fix-*` file included, so a page cannot name its way to a bigger budget. A rewritten page names its own `kind`.

`content/AGENTS.md` says how to add a page to its tab and wire it into the site.

## Writing

**Clear, short and direct.** A reader should get the point of a page from its first screen, and the point of a section from its first sentence. Prose carries reasons and order; lists, tables and bold make a page easy to scan. Use each where it helps.

- **A title is the task in the words a reader would type,** such as "Upgrade an instance" or "Upload and download files". A concept or reference page takes the name of its subject.
- **A title stands alone in search,** where an agent's results show it without its tab or group. Name the object: "Manage keys for scripts and agents", not "Manage keys".
- **A sidebar label may lean on its group heading, but must be true on its own.** "Second computer" fails: the page is about another directory too. "Read and write" fails: it is true and says nothing. Read a page's steps, not its first sentence, before naming it.
- **The everyday path comes first.** Steps show what works when nothing goes wrong. Error cases, rare choices and recovery go in their own section or page, linked from the step, never written into it.
- **Answer first.** The `description` shows as the lead under the title. The first paragraph adds what the description can't: the idea, the reason it matters, or what the reader will have at the end. Never restate the description, and never open with "This page explains" or "This guide shows".
- **Short paragraphs.** One to three sentences, about 20 to 30 words each on average. One idea per paragraph.
- **Bold the names of things on screen**, such as a button or a menu item, and write a menu path with `>` between bolded items: **File** > **New** > **Project**. Keys are written as on the keyboard: Command-R.
- **Bold the key fact.** In each section, bold the few words a skimming reader must not miss. In a list a reader scans, bold the lead-in of each item, then explain it after a full stop or a colon. Never bold whole sentences.
- **A list carries items that are parallel**: steps, options, things to check. A page never opens with a list, except the three opening lines of a tutorial, and a list never stands in for an explanation of why.
- **A table compares things or holds what a reader looks up**: fields, settings, commands, options, a choice between two ways. Keep cells short. **Tables stay tables**: never turn one into a list to fit a phone. At phone width every table stacks each row, and a table of three or more columns puts each cell after the first under its column's name, so give each column a header that reads as a label.
- **Explain, then point.** A concept page explains the idea and the rules a reader meets in normal use, with one small example. Rare cases, limits, exact numbers and error codes go in a guide, the API reference or the contract, with a link.
- **A page is as long as its one job,** and no longer. Ceilings are limits, not targets: cut before you add. A page past a ceiling is usually two pages, or holds detail that belongs in the reference. A guide that covers two jobs done at different times is two guides.
- **Ask of each section: "Which part of this page's job is this section for?"** A section that serves no part of the `job` line is cut, or moved to the page whose job it serves. Review asks this as well as "is it true and complete?".
- **Describe the present.** No history, no "now", no "new", nothing about what changed.
- **Replace, don't append.** When something changes, rewrite the sentence or section it changes. Never add a paragraph that qualifies an older one.

## Vocabulary

Marfa's [`GLOSSARY.md`](https://github.com/withmarfa/marfa/blob/main/GLOSSARY.md), synced here as `src/generated/GLOSSARY.md`, decides every term. Use its word for each thing, in the sense it defines, and never use a word from its Banned list. Don't define a Marfa term differently on a page; link to the Glossary page, `/glossary`, instead. The Glossary page defines each word more briefly than `GLOSSARY.md`, in the same sense, and `pnpm test` fails when either changes until they are compared again.

- The `marfa` program is **the CLI**. One of its commands, such as `marfa items list`, is **a command**.
- One thing the API does is **an operation**, never "a door".
- Write **the bin** for where a deleted item goes, and **move to the bin** for the act. Use `trash` only in a literal name: the owner's **Trash** page, `trashed`, `trash-purge`, `TRASH_RETENTION_DAYS` and API operation titles.

If the glossary doesn't settle a term, ask the owners of the contract before a page uses it.

## Truth

The sources of truth, in withmarfa/marfa:

- the contract, `conformance/spec/`;
- the API description, `openapi.json`;
- the code.

Check every Marfa name, field, error code and rule on a page against them before it's published, including the values in code samples. If the sources disagree, don't choose one for the page: raise the disagreement with the owners of the contract.

Link to the contract chapter a page draws on. Where a reader needs one exact rule, link to its heading, which is its ID, such as [`blobs/lend-earlier-version`](https://github.com/withmarfa/marfa/blob/main/conformance/spec/blobs.md#blobslend-earlier-version). Never cite a statement number, such as "items.md 7": the contract has none.

Don't restate what the API reference says. A page explains what the reference can't: how the pieces fit, the order to do things in, and the reason behind a behavior. Then it links to the operation.

## Mechanics

- No em dashes. Use a colon to introduce, a comma to separate, parentheses for an aside, or a new sentence.
- Present tense, active voice, second person for the reader.
- "Coming soon" appears only on the landing page. Anywhere else, describe only what exists.
- Sentence case for titles and headings. Headings are plain text: no code, links or other markup.
- Inline code is for text a reader would type or copy: type IDs, field names, paths, header names, flags, values. A product name in prose is plain text (the TypeScript SDK, not `@withmarfa/client`).
- Internal links are paths from the site root, such as `/build/files`, so the Markdown copy of each page resolves them. Link text says where the link goes.
- No filler: "simply", "just", "easy", "basically", "really", "actually", "very".

## Examples

- **Show the smallest real request that makes the point,** with real field names and values a reader could send, and show what comes back when the answer teaches something.
- **Examples work from any computer with a key, or from the browser.** Use the instance's address and a key, never the server's own machine. Only claiming an instance and recovering the owner's password run on the server itself.
- **One example in each client the page's reader uses.** Where the same task exists in more than one client, write it as a group of code tabs in this order: CLI, HTTP, TypeScript, Swift. Give every group `tab-group="client"`, so a reader's choice follows them through the site. Include only the clients where the operation exists; never a tab with a stub. Choose for the reader: a Use or Run page shows the CLI, with HTTP only where the reader needs it, a connector guide shows TypeScript and HTTP, the Quickstart shows what runs in a terminal, and a concept page may show one HTTP request when the request is the idea.

  ````mdx
  ```bash tab="CLI" tab-group="client"
  marfa items get <id>
  ```

  ```http tab="HTTP"
  GET /items/<id>
  Authorization: Bearer <key>
  ```
  ````

- **Raw HTTP goes in `http` blocks,** with the method, path, the headers that matter and the body.
- **A block holds code a reader would run or copy, and nothing else.** What a command prints goes with it in `<Terminal>`: the command's block, then the output's block as `text` or `json`. The page shows one block under a "Terminal" header, with the command and then the output in muted text below it, and Copy takes the command only. An HTTP response is not output: it is the shape a reader gets back, so it keeps its own block after the request.
- **Show the code a step adds, not the whole file again.** A block, or a terminal, over 24 lines shows its first lines with a "Show all" button under them, which keeps a page readable, but a long block is still a long block. Cut it to what the reader needs, and link the complete source when there is one.
- **Give a block a `title`** when the reader needs to know where the code goes, such as a file name. The title is the header's label; a block without one has a header row with Copy only. An HTTP request and its response are two blocks, titled `Request` and `Response`; a request that sits in code tabs is labeled by its tab, and its response follows the tabs as a block titled `Response`. Show a response when it teaches something. A response adds `note="Server-sent events"`, a lighter note at the right of the header, or `status="200"`, a chip that reads "200 OK" (green for 2xx, red for 4xx and 5xx). Write a response's body in the language it is: `json` for a JSON body, `sse` for an event stream, whose field names and `data:` JSON are colored. Only a terminal's output is muted.
- **Every example runs.** Check each against a real instance before it's published.
- **Every command and option exists.** `pnpm test` reads each `marfa` command in a shell block or in inline code, and each option in a bare code span, against the CLI's command reference (`src/generated/cli-commands.json`), and names the page, the line and the text that the reference lacks. A block that holds a command of another tool, or a deliberate wrong example, takes `command-check="other-tool"` or `command-check="counterexample"` after its language, as in the opening line `bash command-check="counterexample"`, which follows the three backticks. An option of another tool in inline code goes in `src/lib/command-check-allowlist.json` with its reason. The test fails on a marker or an entry that excuses nothing, so none outlasts its use.

Examples are not runnable on the page: the API reference has a request builder for that, and a reader needs their own instance anyway.

## Components

Use a component for what it's for, and only where it helps the reader.

| Component | Use it for |
| --- | --- |
| `Steps` | An ordered procedure: the Quickstart, the tutorials, a how-to with an order. Each step opens with a `###` heading |
| `Steps paged` | A tutorial: one step on screen at a time in a card, with a step indicator and Previous and Next buttons above it. The card takes each step's height, so keep its steps close in length. A how-to's few short steps stay a plain `Steps` list |
| `Terminal` | A command and what it prints, as one block under a "Terminal" header (see Examples) |
| Code tabs | The same example in more than one client: the tabs are the block's header row, with Copy at the right (see Examples) |
| `Tabs` | Alternatives that aren't code, such as two ways to claim an instance |
| `Accordion` | Entries a reader opens one at a time. Never a reference list: a list a reader looks up is a plain table on its Catalog or Reference page |
| `Files` | A directory a reader will see on disk |
| `Callout` | Something that must interrupt: an action that can't be undone, a step that loses data, or the landing page's one-line warning that Marfa is early. Every callout has a bold `title` that says what happens, and a short body under it. It draws no icon. `type="warn"` is for a loss or something that can't be undone; a neutral note takes the default, `info` |
| `Cards` | Where to go next: the landing page's paths and the end of a tutorial. Never a tab's or a section's index |
| `ApiMap` | The API reference's overview only: every operation, drawn from `openapi.json`, in its group and area (`src/lib/api-map-areas.json`), each linking to its page. Groups start closed; one button above the map opens or closes them all |

Write an object's fields as a Markdown table (field, type, description), not with `TypeTable`: a table reads the same on the page and in the Markdown copy.

An interactive figure builds its controls from `Controls`, `Choices` and `Menu` in `src/components/visuals/interactive.tsx`, and nothing else: one style of control on every page (see Visuals).

The Markdown copy of a page, which agents read, keeps the content of `Steps`, `Tabs`, code tabs, `Accordions` and `ReferenceList`, writes `Card`, `Callout`, `Accordion`, `Tab`, a code tab's label, `Sequence`, `Files` and `Terminal` (the command, then "Output:" and its output) as plain Markdown, and a block's `note` or `status` as a line above it, such as "Response (Server-sent events):", and leaves the visuals out (`source.config.ts`). `Changelog` writes every release and every line of its notes. `ApiMap` writes every operation as its method and path with a link to its page, under its area and group. A component outside those lists is left out of the copy too, so add it there before a page relies on it.

## Visuals

A visual earns its place by showing what prose can't, in the form that suits the idea. Before adding one, write down what it shows, why a visual helps there and why that form; if you can't, leave it out. Most pages need none.

**Draw a real example, not a category.** A figure of "your notes app on your iPhone" and "a Todoist connector" teaches more than boxes named "Apps" and "Connectors".

- **A static figure** shows a shape: what connects to what, what holds what, which way things flow. Build it with `Figure` in `src/components/visuals/`.
- **A sequence** shows order in time: two writers editing one item, a write going from queue to verdict. Build it with `Sequence`, which takes an ordered list in the MDX and shows every step at once on a numbered timeline, so the reader sees the whole story and the Markdown copy keeps every step.
- **An interactive diagram** shows cause and effect a reader explores, such as what moving an item to the bin takes with it. Use one only when the interaction is the point; a few cases side by side are often clearer as a static figure.
- **A table** is often the right visual for a comparison.

Every visual follows these rules:

- **The prose carries every fact.** A visual shows the shape of what the text says; nothing is only in the visual, and no list after it repeats it.
- **Use HTML and CSS on the site's theme tokens** (`--color-fd-*`, and `--marfa-diagram-accent` for the one accent color), so light and dark both work. No images and no hard-coded colors.
- **Caption short, or none.** The lead-in sentence before a figure states the fact it shows, never "the figure shows" or "pick a key": the Markdown copy leaves the figure out. A caption, if any, is one short line.
- **Color marks one thing**: the part the page is about, such as the items a cascade takes. Everything else stays neutral.
- **One style of control.** One row of the site's buttons, each named for its choice ("Bin the note", "Notes app"), with no label, prompt, tabs or reset. The figure opens with a choice made. A second choice is one compact menu at the right of the same row; in a narrow figure it always sits on its own line under the buttons, so nothing moves when the reader chooses.
- **Nothing moves.** A choice changes what's highlighted and what the text says, never a size or the layout: the figure keeps one height, and every changing word sits in a place as large as its longest version. The server render shows the whole visual. A filter on a lookup page, such as the Changelog's part filters, may show and hide entries.
- **Fit at phone width** (375 px) with no horizontal scroll, and keep labels to a few words on one line. Only a figure's row of buttons may scroll sideways; it never wraps.
- **Make controls usable by keyboard,** with visible focus. Choices are buttons with `aria-pressed`, and a menu's options are `menuitemradio` items that arrow keys move through.

## Keeping pages current

The docs stay right by being rewritten whole, not by being added to.

- **A code change opens a docs issue, not a docs pull request.** The issue says what a reader would now get wrong. Nobody edits a page inside the work that changed the code.
- **Pages are rewritten from those issues after each release.** One docs agent works the open issues and rewrites each page whole, to this file. A page is never added to, and "no change needed" is a normal answer.
- **Generated reference and the changelog are synced, never written by hand.** The API reference, the CLI's global options and exit codes, the error codes, the settings, the shipped types and edge types, the permissions, the event types and the glossary come from withmarfa/marfa through `scripts/sync-from-marfa.sh`. Each connector's header and the connector index come from marfa-connectors through `scripts/sync-from-connectors.sh`. The Changelog comes from the GitHub release notes through `scripts/sync-changelog.ts`.

`scripts/staleness-report.ts` is the backstop that lists pages no issue named; `AGENTS.md`, "Docs pass at each release", says how to run it.

## Frontmatter

Every page starts with a `title` and a one-sentence `description`. Both are required. The title is at most 12 words and the description at most 40, because a reader reads both as the page's first lines. The description says what the page gives the reader, not what it contains. Every page also has a `job`: one sentence, at most 30 words, saying who the reader is and what they leave able to do. `pnpm test` checks it (a page in `pending` may lack one until it is rewritten). A page may also name its `kind` (see "Page types").

```mdx
---
title: Files
description: How Marfa keeps a file's bytes once, however many items name them, and who may read them.
job: A builder learns how Marfa stores a file once and who may read it.
kind: concept
---
```

A page whose title another page shares, or whose title doesn't name it well outside the site, also holds a `headTitle`: its name in browser tabs, search results and link previews, which the site name follows unless it starts with it. The landing page's is "Marfa Docs" and what Marfa is, after a colon. `pnpm test` fails when two pages would show the same name.

A page whose title wraps in the sidebar can also hold a `sidebar_label`, a shorter name for the sidebar and the breadcrumb. The previous and next cards, the heading, search, `llms.txt` and the page's metadata keep the full title.

Quote a `description` that starts with `@`, `:`, `>`, `|`, `*`, `&`, `?` or `%`, or YAML misreads it.
