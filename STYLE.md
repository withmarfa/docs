# Writing the Marfa docs

How every page on this site is written. This file is the one place the writing rules live. The content lint checks the rules a machine can check; passing it isn't the same as following this file.

## Standards

- **Prose** follows the [Google developer documentation style guide](https://developers.google.com/style). Where this file is silent, that guide decides.
- **Structure** follows [Diátaxis](https://diataxis.fr/): each page is one kind of page, and the kinds stay apart.
- **Spelling** is American English: color, organization, canceled.

## Who reads the docs

Write for a reader who is new to Marfa but not to software. Four readers come most often, and each needs something different first:

- **Someone deciding whether Marfa is for them** needs to know what it is and to see it work: the Overview, then the Quickstart.
- **An app builder** needs a credential, then reading and writing items, then the model: the concepts, then the Build apps guides.
- **Someone running an instance** needs to start it, claim it and keep it safe: the Quickstart, then the Run Marfa guides.
- **A connector author** needs what the instance keeps for a connector, then the tutorial and the connector guides.

AI agents read the same pages as Markdown. A page that a newcomer can follow serves an agent too.

## Where a page goes

| Tab | Sidebar group | Kind of page |
| --- | --- | --- |
| Overview | Get started: Overview, Quickstart | Explanation, then a tutorial |
| Overview | Concepts | Explanation: one idea per page |
| Overview | SDKs and CLI | How-to for each client, and the CLI reference |
| Overview | Resources: Troubleshooting, Glossary, Changelog, Docs for agents | How-to and reference |
| Guides | Tutorials, Build apps, Build connectors, Run Marfa | Tutorial, how-to |
| API reference | The overview, Errors, and the operations generated from the API description | Reference |

- A **concept** page explains one idea: what it is, why it works the way it does, and the rules a reader meets in normal use.
- A **tutorial** takes a newcomer through one complete piece of work, start to finish, and every step works.
- A **how-to guide** does one task for a reader who already knows the concepts.
- A **reference** page states facts and never teaches.

## Writing

**A page is prose first.** Explain in sentences and paragraphs: they carry reasons, order and connection, which lists can't. Lists, tables and bold are welcome where they help, and the balance is a choice made on purpose for each page.

- **Open with what the page covers and why it matters.** The `description` shows as the lead under the title. The page's first paragraph, before any heading, list or figure, then says in a few sentences what the reader will understand or do, and why it matters to them. Never repeat the description.
- **A list carries items that are truly parallel**: steps of one kind, options of one kind, things a reader checks off. A list never stands in for an explanation, and a page never opens with one.
- **A table compares things on more than one attribute.** A list of names and one-line meanings is a list.
- **Bold marks what a reader must not miss**, a few times a page at most. Never bold the start of every list item.
- **Less is clearer.** Explain the idea and the rules a reader meets in normal use. Leave rare cases, limits and exact numbers to the API reference and the contract, and link to them. If a page is hard going, cut before you add.
- **One idea per section.** Say the idea, then show a small example.
- **Describe the present.** No history, no "now", no "new", nothing about what changed.
- **Replace, don't append.** When something changes, rewrite the sentence or section it changes. Never add a paragraph that qualifies an older one.
- **Short paragraphs.** Two to four sentences each.

Most pages need no more than 1,200 words. A page that grows past that is usually two pages, or holds detail that belongs in the reference.

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
- "Coming soon" appears only on the Overview. Anywhere else, describe only what exists.
- Sentence case for titles and headings. Headings are plain text: no code, links or other markup.
- Inline code is for text a reader would type or copy: type IDs, field names, paths, header names, flags, values. A product name in prose is plain text (the TypeScript client, not `@withmarfa/client`).
- Internal links are paths from the site root, such as `/files`, so the Markdown copy of each page resolves them. Link text says where the link goes.
- No filler: "simply", "just", "easy", "basically", "really", "actually", "very".
- No personal infrastructure: no internal hostnames, private IP addresses, or personal paths.

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
- **A block holds code a reader would run or copy, and nothing else.** Output goes in its own block, as `text` or `json`.
- **Give a block a `title`** when the reader needs to know where the code goes, such as a file name.
- **Every example runs.** Check each against a real instance before it's published.

Examples are not runnable on the page: the API reference has a request builder for that, and a reader needs their own instance anyway.

## Components

Use a component for what it's for, and only where it helps the reader. `Card`, `Cards` and `Callout` are available on every page; the others are registered in `src/components/mdx.tsx`.

| Component | Use it for |
| --- | --- |
| `Steps` | An ordered procedure: the Quickstart, the tutorials, a how-to with an order |
| Code tabs | The same example in more than one client (see Examples) |
| `Tabs` | Alternatives that aren't code, such as two ways to claim an instance |
| `TypeTable` | The fields of an object, where a reader needs each name, type and meaning |
| `Accordion` | Content a reader looks up, not reads through: troubleshooting entries, long catalogues |
| `Files` | A directory a reader will see on disk |
| `Callout` | Something that must interrupt: an action that can't be undone, a step that loses data |
| `Cards` | Where to go next, at the end of a tutorial and on the Overview |

## Visuals

A visual earns its place by showing what prose can't, in the form that suits the idea. Before adding one, write down what it shows, why a visual helps there and why that form; if you can't, leave it out. Most pages need none.

- **A static figure** shows a shape: what connects to what, what holds what, which way things flow. Build it with `Figure` in `src/components/visuals/`.
- **A sequence** shows order in time: two writers editing one item, a write going from queue to verdict. Build it with `Sequence`, which takes an ordered list in the MDX and shows one step at a time, so the page's Markdown copy keeps every step.
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

- **Generated reference is synced, never written by hand.** The API reference, the CLI reference, the error codes, the settings, the shipped types and edge types, the permissions, the event types and the glossary come from withmarfa/marfa through `scripts/sync-from-marfa.sh`.
- **A code change doesn't need a docs change.** Code repositories don't open a pull request here for each public change.
- **A docs pass runs at each release.** It reads every page whose contract rules or operations changed since the last release and rewrites each one whole, to this file. "No change needed" is a normal answer.
- **A page that grows is a warning.** When a change makes a page much longer, check whether the new text belongs in the reference instead, or replaces something.

`scripts/staleness-report.ts` lists the pages to read for a docs pass; `AGENTS.md`, "Keeping pages current", says how to run it.

## Frontmatter

Every page starts with a `title` and a one-sentence `description`. Both are required. The description says what the page gives the reader, not what it contains.

```mdx
---
title: Files
description: How Marfa keeps a file's bytes once, however many items name them, and who may read them.
---
```

Quote a `description` that starts with `@`, `:`, `>`, `|`, `*`, `&`, `?` or `%`, or YAML misreads it.
