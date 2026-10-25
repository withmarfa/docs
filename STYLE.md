# Writing the Marfa docs

How every page on this site is written. This file is the one place the writing rules live. The content lint checks the rules a machine can check; passing it isn't the same as following this file.

## Standards

- **Prose** follows the [Google developer documentation style guide](https://developers.google.com/style). Where this file is silent, that guide decides.
- **Structure** follows [Diátaxis](https://diataxis.fr/): each page is one kind of page, and the kinds stay apart.
- **Spelling** is American English: color, organization, canceled.

## Who reads the docs

Write for a reader who is new to Marfa. Most know software; some don't, and more of them will as apps built on Marfa reach people. The Introduction and the concepts must make sense to both. Five readers come most often, and each needs something different first:

- **Someone deciding whether Marfa is for them** needs to know what it is, what it's for and what it isn't: the Introduction, then How Marfa works.
- **An app builder** needs a credential, then reading and writing items, then the model: the Quickstart, the concepts, then the Build apps and agents guides.
- **Someone running an instance** needs to start it, claim it and keep it safe: the Quickstart, then the Run Marfa guides.
- **A connector author** needs what the instance keeps for a connector, then the tutorial and the connector guides.
- **An AI agent**, working for any of them, reads the same pages as Markdown, through the docs MCP server or `marfa docs`.

A page that a newcomer can follow serves an agent too. Never write that Marfa is only for technical people.

## Where a page goes

| Tab | Sidebar groups | Kind of page |
| --- | --- | --- |
| Overview | Get started: the Overview, an index of the docs; the Introduction; the Quickstart | Navigation, explanation, then a tutorial |
| Overview | Concepts: How Marfa works, then one page per idea, then the Glossary | Explanation, then reference |
| Overview | AI tools: the Docs MCP server and Docs as Markdown | How-to |
| Guides | Tutorials, Build apps and agents, Build connectors, Run Marfa (ending with Troubleshooting) | Tutorial, how-to |
| Catalog | The Catalog, Items, Edges, Events and Permissions pages, then Types (the Core types and System types folders with one page per type, then Type rules and Field kinds) | Reference |
| Reference | SDKs and CLI: one page each, and the file the CLI keeps for other programs | How-to and reference for each client, then reference |
| Reference | HTTP API: the overview, Errors, and the operations generated from the API description | Reference |
| Reference | Resources: the Changelog and the contract | Reference |

The tabs divide the work, and each thing is said once, with links between:

- **Overview** explains what Marfa is and how it works, with two or three examples at most.
- **Guides** show how to do things.
- **Catalog** lists exactly what Marfa ships and explains nothing.
- **Reference** covers the HTTP API's operations and errors, the SDKs, the CLI, the changelog and the contract.

A page that needs a list the Catalog holds, such as the types, edge types, permissions, events, field kinds or reserved names, links to the Catalog page instead of restating it.

- A **concept** page explains one idea: what it is, why it works the way it does, and the rules a reader meets in normal use.
- A **tutorial** takes a newcomer through one complete piece of work, start to finish, and every step works.
- A **how-to guide** does one task for a reader who already knows the concepts.
- A **reference** page states facts and never teaches. Generated reference is shown as tables, never as raw help text.

`content/AGENTS.md` says how to add a page to its tab and wire it into the site.

## Writing

**Clear, short and direct.** A reader should get the point of a page from its first screen, and the point of a section from its first sentence. Prose carries reasons and order; lists, tables and bold make a page easy to scan. Use each where it helps.

- **Answer first.** The `description` shows as the lead under the title. The first paragraph adds what the description can't: the idea, the reason it matters, or what the reader will have at the end. Never restate the description, and never open with "This page explains" or "This guide shows".
- **Short paragraphs.** One to three sentences, about 20 to 30 words each on average. One idea per paragraph.
- **Bold the names of things on screen**, such as a button or a menu item, and write a menu path with `>` between bolded items: **File** > **New** > **Project**. Keys are written as on the keyboard: Command-R.
- **Bold the key fact.** In each section, bold the few words a skimming reader must not miss. In a list a reader scans, bold the lead-in of each item, then explain it after a full stop or a colon. Never bold whole sentences.
- **A list carries items that are parallel**: steps, options, things to check. A page never opens with a list, and a list never stands in for an explanation of why.
- **A table compares things or holds what a reader looks up**: fields, settings, commands, options, a choice between two ways. Keep cells short.
- **Explain, then point.** A concept page explains the idea and the rules a reader meets in normal use, with one small example. Rare cases, limits, exact numbers and error codes go in a guide, the API reference or the contract, with a link.
- **Less is clearer.** If a page is hard going, cut before you add. A concept page is usually 400 to 900 words and a guide under 1,500. A page past that is usually two pages, or holds detail that belongs in the reference.
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
- **Give a block a `title`** when the reader needs to know where the code goes, such as a file name. The title is the header's label; a block without one has a header row with Copy only. An HTTP request and its response are titled `Request` and `Response`. A response adds `note="Server-sent events"`, a lighter note at the right of the header, or `status="200"`, a chip that reads "200 OK" (green for 2xx, red for 4xx and 5xx). Write a response's body in the language it is: `json` for a JSON body, `sse` for an event stream, whose field names and `data:` JSON are coloured. Only a terminal's output is muted.
- **Every example runs.** Check each against a real instance before it's published.
- **Every command and option exists.** `pnpm test` reads each `marfa` command in a shell block or in inline code, and each option in a bare code span, against the CLI's command reference (`src/generated/cli-commands.json`), and names the page, the line and the text that the reference lacks. A block that holds a command of another tool, or a deliberate wrong example, takes `command-check="other-tool"` or `command-check="counterexample"` after its language, as in the opening line `bash command-check="counterexample"`, which follows the three backticks. An option of another tool in inline code, or a command that a page names because a release removed it, goes in `src/lib/command-check-allowlist.json` with its reason. The test fails on a marker or an entry that excuses nothing, so none outlasts its use.

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
| `Cards` | Where to go next: the Overview, an index of the docs, and the end of a tutorial or of the Introduction |

Write an object's fields as a Markdown table (field, type, description), not with `TypeTable`: a table reads the same on the page and in the Markdown copy.

The Markdown copy of a page, which agents read, keeps the content of `Steps`, `Tabs`, code tabs, `Accordions` and `ReferenceList`, writes `Card`, `Callout`, `Accordion`, `Tab`, a code tab's label, `Sequence`, `Files` and `Terminal` (the command, then "Output:" and its output) as plain Markdown, and a block's `note` or `status` as a line above it, such as "Response (Server-sent events):", and leaves the visuals out (`source.config.ts`). A component outside those lists is left out of the copy too, so add it there before a page relies on it.

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
- **The server render shows the whole visual,** and nothing moves when it's used: a control changes what's highlighted, never the layout.
- **Fit at phone width** (375 px) with no horizontal scroll, and keep labels to a few words on one line.
- **Make controls usable by keyboard,** with visible focus. Selections are buttons with `aria-pressed`.

## Keeping pages current

The docs stay right by being rewritten whole, not by being added to.

- **Generated reference is synced, never written by hand.** The API reference, the CLI's global options and exit codes, the error codes, the settings, the shipped types and edge types, the permissions, the event types and the glossary come from withmarfa/marfa through `scripts/sync-from-marfa.sh`.
- **A code change doesn't need a docs change.** Code repositories don't open a pull request here for each public change.
- **A docs pass runs at each release.** It reads every page whose contract rules or operations changed since the last release and rewrites each one whole, to this file. "No change needed" is a normal answer.
- **A page that grows is a warning.** When a change makes a page much longer, check whether the new text belongs in the reference instead, or replaces something.

`scripts/staleness-report.ts` lists the pages to read for a docs pass; `AGENTS.md`, "Docs pass at each release", says how to run it.

## Frontmatter

Every page starts with a `title` and a one-sentence `description`. Both are required. The description says what the page gives the reader, not what it contains.

```mdx
---
title: Files
description: How Marfa keeps a file's bytes once, however many items name them, and who may read them.
---
```

Quote a `description` that starts with `@`, `:`, `>`, `|`, `*`, `&`, `?` or `%`, or YAML misreads it.
