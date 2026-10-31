# Writing the Marfa docs

How every page on this site is written. This file is the one place the writing rules live. The content lint checks the rules a machine can check; passing it isn't the same as following this file.

## Standards

- **Prose** follows the [Google developer documentation style guide](https://developers.google.com/style). Where this file is silent, that guide decides.
- **Structure** follows [Diátaxis](https://diataxis.fr/): each page is one kind of page, and the kinds stay apart.
- **Spelling** is American English: color, organization, canceled.

## Who reads the docs

Write for a reader who is new to Marfa. Most know software; some don't, and more of them will as apps built on Marfa reach people. The Introduction and the concepts must make sense to both. Five readers come most often, and each needs something different first:

- **Someone deciding whether Marfa is for them** needs to know what it is, what it's for and what it isn't: the Introduction, then How Marfa works.
- **An app builder** needs a credential, then reading and writing items, then the model: the Quickstart, the concepts, then Build.
- **Someone running an instance** needs to start it, claim it and keep it safe: the Quickstart, then Run.
- **A connector author** needs what the instance keeps for a connector, then the connector tutorials and guides in Build.
- **An AI agent**, working for any of them, reads the same pages as Markdown, through the docs MCP server or `marfa docs`.

A page that a newcomer can follow serves an agent too. Never write that Marfa is only for technical people.

## Where a page goes

| Tab | Sidebar groups | Kind of page |
| --- | --- | --- |
| Overview | Get started: the Overview, an index of the docs; the Introduction; the Quickstart | Navigation, explanation, then a tutorial |
| Overview | Concepts: How Marfa works, then one page per idea, then the Glossary | Explanation, then reference |
| Build | Build on Marfa, an index of the tab; Tutorials; Build apps and agents; Build connectors | Navigation, tutorial, then how-to |
| Run | Run Marfa, an index of the tab; Set up; Keys and access; Folders; Connectors; Look after it (ending with Troubleshooting) | Navigation, then how-to |
| Catalog | The Catalog, Items, Types (its own page, with the Core types and System types folders of one page per type under it, then Type rules and Field kinds), Edges, Events, Permissions, Connectors (its own page, with one page for each connector Marfa ships under it) | Reference |
| Reference | The Reference landing page (`/reference`): a card for each of the SDKs, the CLI, the Marfa MCP server, the HTTP API, the Changelog, Read these docs from an agent and the contract | Reference |
| Reference | SDKs, CLI and MCP: one page each, the file the CLI keeps for other programs, and the Marfa MCP server | How-to and reference for each client, then reference |
| Reference | HTTP API: the overview, Errors, and the operations generated from the API description | Reference |
| Reference | Resources: the Changelog, Read these docs from an agent, and the contract | Reference, then how-to |

The tabs divide the work, and each thing is said once, with links between:

- **Overview** explains what Marfa is and how it works, with two or three examples at most.
- **Build** shows how to write an app, an agent or a connector on Marfa.
- **Run** shows how to run an instance and look after it, and how to use Marfa without writing code.
- **Catalog** lists exactly what Marfa ships and explains nothing.
- **Reference** covers the HTTP API's operations and errors, the SDKs, the CLI, the MCP server, the changelog and the contract.

A page that needs a list the Catalog holds, such as the types, edge types, permissions, events, field kinds or reserved names, links to the Catalog page instead of restating it.

- A **concept** page explains one idea: what it is, why it works the way it does, and the rules a reader meets in normal use.
- A **tutorial** takes a newcomer through one complete piece of work, start to finish, and every step works.
  A tutorial has at most seven steps; a longer piece of work becomes two tutorials, split where the first one already leaves something that works. It opens with three short lines, in a list: **You'll build** (what the reader makes), **You need** (what must be in place) and **You'll have** (what works at the end). Each line is true of the page, and a short paragraph of background may follow. Keep sentences short, put the point first, and explain a Marfa term before using it.
- A **how-to guide** does one task for a reader who already knows the concepts.
- A **reference** page states facts and never teaches. Generated reference is shown as tables, never as raw help text.

`content/AGENTS.md` says how to add a page to its tab and wire it into the site.

## Writing

**Clear, short and direct.** A reader should get the point of a page from its first screen, and the point of a section from its first sentence. Prose carries reasons and order; lists, tables and bold make a page easy to scan. Use each where it helps.

- **Answer first.** The `description` shows as the lead under the title. The first paragraph adds what the description can't: the idea, the reason it matters, or what the reader will have at the end. Never restate the description, and never open with "This page explains" or "This guide shows".
- **Short paragraphs.** One to three sentences, about 20 to 30 words each on average. One idea per paragraph.
- **Bold the names of things on screen**, such as a button or a menu item, and write a menu path with `>` between bolded items: **File** > **New** > **Project**. Keys are written as on the keyboard: Command-R.
- **Bold the key fact.** In each section, bold the few words a skimming reader must not miss. In a list a reader scans, bold the lead-in of each item, then explain it after a full stop or a colon. Never bold whole sentences.
- **A list carries items that are parallel**: steps, options, things to check. A page never opens with a list, except the three opening lines of a tutorial, and a list never stands in for an explanation of why.
- **A table compares things or holds what a reader looks up**: fields, settings, commands, options, a choice between two ways. Keep cells short.
- **Explain, then point.** A concept page explains the idea and the rules a reader meets in normal use, with one small example. Rare cases, limits, exact numbers and error codes go in a guide, the API reference or the contract, with a link.
- **Less is clearer.** If a page is hard going, cut before you add. A page past its limit is usually two pages, or holds detail that belongs in the reference: a guide that covers two jobs done at different times is two guides. `pnpm test` enforces the limits, counting the words after the frontmatter, code included: **900 for a concept page, 1,500 for a guide, a tutorial or a Catalog connector page.** The folder decides the kind. A lookup page (Settings, the CLI and SDK pages, the Glossary, the API reference, the Catalog type pages and the Changelog) has a limit of its own, and so does a tutorial or guide whose kind differs from its folder's. Those exceptions, each with its reason, are in `src/lib/page-limits.json`, and no page is exempt. When a page is over, the failure names it and the way out: split it, move detail to the reference, or cut. A page that is over today is listed there as rewrite pending, with its current count as a ceiling that it must not pass.
- **Describe the present.** No history, no "now", no "new", nothing about what changed.
- **Replace, don't append.** When something changes, rewrite the sentence or section it changes. Never add a paragraph that qualifies an older one.

## Vocabulary

Marfa's [`GLOSSARY.md`](https://github.com/withmarfa/marfa/blob/main/GLOSSARY.md), synced here as `src/generated/GLOSSARY.md`, decides every term. Use its word for each thing, in the sense it defines, and never use a word from its Banned list. Don't define a Marfa term differently on a page; link to the Glossary page, `/glossary`, instead.

- The `marfa` program is **the CLI**. One of its commands, such as `marfa items list`, is **a command**.
- One thing the API does is **an operation**, never "a door".

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
- "Coming soon" appears only on the Introduction. Anywhere else, describe only what exists.
- Sentence case for titles and headings. Headings are plain text: no code, links or other markup.
- Inline code is for text a reader would type or copy: type IDs, field names, paths, header names, flags, values. A product name in prose is plain text (the TypeScript SDK, not `@withmarfa/client`).
- Internal links are paths from the site root, such as `/files`, so the Markdown copy of each page resolves them. Link text says where the link goes.
- No filler: "simply", "just", "easy", "basically", "really", "actually", "very".

## Examples

- **Show the smallest real request that makes the point,** with real field names and values a reader could send, and show what comes back when the answer teaches something.
- **One example in each client the page's reader uses.** Where the same task exists in more than one client, write it as a group of code tabs in this order: CLI, HTTP, TypeScript, Swift. Give every group `tab-group="client"`, so a reader's choice follows them through the site. Include only the clients where the operation exists; never a tab with a stub. Choose for the reader: a guide to running an instance shows the CLI and HTTP, a connector guide shows TypeScript and HTTP, the Quickstart shows what runs in a terminal, and a concept page may show one HTTP request when the request is the idea.

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
| `Accordion` | Entries a reader opens one at a time, such as troubleshooting. Never a reference list: a list a reader looks up is a plain table on its Catalog or Reference page |
| `Files` | A directory a reader will see on disk |
| `Callout` | Something that must interrupt: an action that can't be undone, a step that loses data, or the Overview's one-line warning that Marfa is early. Every callout has a bold `title` that says what happens, and a short body under it. It draws no icon. `type="warn"` is for a loss or something that can't be undone; a neutral note takes the default, `info` |
| `Cards` | Where to go next: the Overview, an index of the docs, the Build and Run landing pages, and the end of a tutorial or of the Introduction |

Write an object's fields as a Markdown table (field, type, description), not with `TypeTable`: a table reads the same on the page and in the Markdown copy.

The Markdown copy of a page, which agents read, keeps the content of `Steps`, `Tabs`, code tabs, `Accordions` and `ReferenceList`, writes `Card`, `Callout`, `Accordion`, `Tab`, a code tab's label, `Sequence`, `Files` and `Terminal` (the command, then "Output:" and its output) as plain Markdown, and a block's `note` or `status` as a line above it, such as "Response (Server-sent events):", and leaves the visuals out (`source.config.ts`). `Changelog` writes every release and every line of its notes. A component outside those lists is left out of the copy too, so add it there before a page relies on it.

## Visuals

A visual earns its place by showing what prose can't, in the form that suits the idea. Before adding one, write down what it shows, why a visual helps there and why that form; if you can't, leave it out. Most pages need none.

**Draw a real example, not a category.** A figure of "your notes app on your iPhone" and "a Todoist connector" teaches more than boxes named "Apps" and "Connectors".

- **A static figure** shows a shape: what connects to what, what holds what, which way things flow. Build it with `Figure` in `src/components/visuals/`.
- **A sequence** shows order in time: two writers editing one item, a write going from queue to verdict. Build it with `Sequence`, which takes an ordered list in the MDX and shows every step at once on a numbered timeline, so the reader sees the whole story and the Markdown copy keeps every step.
- **An interactive diagram** shows cause and effect a reader explores, such as which writes move an item's version. Use one only when the interaction is the point.
- **A table** is often the right visual for a comparison.

Every visual follows these rules:

- **The prose carries every fact.** A visual shows the shape of what the text says; nothing is only in the visual, and no list after it repeats it.
- **Use HTML and CSS on the site's theme tokens** (`--color-fd-*`, and `--marfa-diagram-accent` for the one accent color), so light and dark both work. No images and no hard-coded colors.
- **The server render shows the whole visual,** and nothing moves when it's used: a control changes what's highlighted, never the layout. A filter on a lookup page, such as the Changelog's part filters, may show and hide entries.
- **Fit at phone width** (375 px) with no horizontal scroll, and keep labels to a few words on one line.
- **Make controls usable by keyboard,** with visible focus. Selections are buttons with `aria-pressed`.

## Keeping pages current

The docs stay right by being rewritten whole, not by being added to.

- **A code change opens a docs issue, not a docs pull request.** The issue says what a reader would now get wrong. Nobody edits a page inside the work that changed the code.
- **Pages are rewritten from those issues after each release.** One docs agent works the open issues and rewrites each page whole, to this file. A page is never added to, and "no change needed" is a normal answer.
- **Generated reference and the changelog are synced, never written by hand.** The API reference, the CLI's global options and exit codes, the error codes, the settings, the shipped types and edge types, the permissions, the event types and the glossary come from withmarfa/marfa through `scripts/sync-from-marfa.sh`. The Changelog comes from the GitHub release notes through `scripts/sync-changelog.ts`.

`scripts/staleness-report.ts` is the backstop that lists pages no issue named; `AGENTS.md`, "Docs pass at each release", says how to run it.

## Frontmatter

Every page starts with a `title` and a one-sentence `description`. Both are required. The description says what the page gives the reader, not what it contains.

```mdx
---
title: Files
description: How Marfa keeps a file's bytes once, however many items name them, and who may read them.
---
```

Quote a `description` that starts with `@`, `:`, `>`, `|`, `*`, `&`, `?` or `%`, or YAML misreads it.
