# Writing the Marfa docs

How every page on this site is written. It is the one place the writing rules live. A lint test checks the rules that can be checked mechanically; passing it isn't the same as following this file.

## Standards

- **Prose** follows the [Google developer documentation style guide](https://developers.google.com/style). Where this file is silent, that guide decides.
- **Structure** follows [Diátaxis](https://diataxis.fr/): each page is one kind of page, and it sits in the tab for that kind.
- **Spelling** is American English: color, organization, canceled.

| Tab | What it holds | Kind of page |
| --- | --- | --- |
| Get started | What Marfa is, Run an instance, Your first items, then Concepts and the Glossary | Tutorials first, then explanation |
| Guides | Tutorials first, then how-to guides | Tutorial, how-to |
| Tools | The `marfa` command, the Swift package, the TypeScript client, docs for agents | Reference and how-to for each tool |
| API reference | The overview, Errors, and the operations generated from the API description | Reference |

A Concepts page explains one idea. A guide does one task from start to finish. A reference page states facts and never teaches.

## Vocabulary

Marfa's [`GLOSSARY.md`](https://github.com/withmarfa/marfa/blob/main/GLOSSARY.md), synced here as `src/generated/GLOSSARY.md`, decides every term. Use its word for each thing, in the sense it defines, and never use a word from its Banned list. Don't define a Marfa term differently on a page; link to the Glossary page, `/get-started/glossary`, instead.

Some words aren't on the Banned list but are still wrong in public prose. Avoid "door": the glossary's word for one thing the API does is "operation".

If the glossary doesn't settle a term, ask the owners of the contract before a page uses it.

## Truth

The sources of truth, in withmarfa/marfa:

- the contract, `conformance/spec/`;
- the API description, `openapi.json`;
- the code.

Check every Marfa name, field, error code and rule on a page against them before it's published, including the values in code samples. If the sources disagree, don't choose one for the page: raise the disagreement with the owners of the contract.

Never cite a contract statement number, such as "items.md 7". The numbers are being replaced with permanent IDs. Link to the chapter instead.

Don't restate what the API reference already says. A page explains what the reference can't: how the pieces fit, the order to do things in, and the rule behind a behavior. Then it links to the operation.

## Mechanics

- No em dashes. Use a colon to introduce, a comma to separate, parentheses for an aside, or a new sentence.
- Present tense. Describe what exists now.
- "Coming soon" appears only on What Marfa is and Run an instance. Anywhere else, describe only what exists.
- Sentence case for titles and headings.
- Headings are plain text: no code, links or other markup.
- Inline code is for text a reader would type or copy: type IDs, field names, paths, header names, flags, values. A product name in prose is plain text (the TypeScript client, not `@withmarfa/client`).
- Internal links are paths from the site root, such as `/get-started/files`, so the Markdown copy of each page resolves them. Link text says where the link goes.
- No filler: "simply", "just", "easy", "basically", "really", "actually", "very".
- No personal infrastructure: no internal hostnames, private IP addresses, or personal paths.

## Page shape

Short and clear, never overloaded. A reader should finish a page knowing one thing well.

- **Open with what the page covers.** The `description` is shown as the lead. Add a sentence or two before the first heading only if the description doesn't orient the reader, and never repeat it.
- **One idea per section.** State the rule, then show a small example.
- **Tables where you compare, lists where you enumerate.** Five or more things of one kind go in a table.
- **Link to the API reference** rather than restate request and response shapes.
- **Nest no more than two levels** in a page without a reason.
- **Use components for their purpose.** `<Steps>` for an ordered procedure, `<Tabs>` for alternatives such as languages, `<Callout>` for something that has to interrupt the reader.

### Code samples

- Show the smallest real request that makes the point, with real field names and values a reader could send.
- Write raw HTTP in `http` blocks until the site has example tabs.
- A fenced block holds code a reader would run or copy, and nothing else.

```http
POST /items
Content-Type: application/json

{ "type": "core.note", "properties": { "title": "Reading list", "body": "Start with the essays." } }
```

## Diagrams

A diagram earns its place when it explains a shape better than words: what connects to what, or what reaches where. Use one per page at most.

- **Build it as an interactive React component** in `src/components/diagrams/`, and register it in `src/components/mdx.tsx`. Start from the shared pieces in `src/components/diagrams/diagram.tsx` and copy the data-driven pattern of `instance-map.tsx`: nodes and captions are data, and the component draws them.
- **Use HTML and CSS on the site's theme tokens** (`--color-fd-*`, and `--marfa-diagram-accent` for the one accent color), so light and dark both work. No images and no hard-coded colors.
- **Make it usable by keyboard.** Selections are buttons with `aria-pressed`, focus is visible, and Escape clears.
- **Make it fit at phone width** (375 px) with no horizontal scroll.
- **Keep every label and summary on one line** at every width the layout uses, so keep them to a few words. A caption, shown on selection, can wrap.
- **Make it useful before JavaScript runs.** The server render shows the whole diagram.
- **Follow it with a plain-text list that says the same thing.** Agents, search and the Markdown copy of the page read the list, not the diagram.

## Placeholders

A page that isn't written yet holds the placeholder callout and a list of what it will cover:

```mdx
<Callout title="Placeholder">This page isn't written yet.</Callout>

Planned topics:

- Starting the server.
```

## Frontmatter

Every page starts with a `title` and a one-sentence `description`. Both are required.

```mdx
---
title: Files
description: How Marfa keeps the bytes of a file and how an item points at them.
---
```

Quote a `description` that starts with `@`, `:`, `>`, `|`, `*`, `&`, `?` or `%`, or YAML misreads it.
