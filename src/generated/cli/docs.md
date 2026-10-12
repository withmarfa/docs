Read Marfa's public docs: search them, list their pages, or print one.

Reads the docs site at https://docs.marfa.so, or at the address in MARFA_DOCS_URL. It needs no server, store or key, and sends no credential.

A page is its path on the site. `files`, `/files`, `files.md` and `https://docs.marfa.so/files` name the same page. `search`, `topics` and `help` are commands, so a page with one of those names takes a leading slash, such as `/search`.

`--url` and `--key` name a Marfa server, so this command refuses them.

```text
marfa docs [OPTIONS] [PAGE]
marfa docs <COMMAND>
```

| Argument | Description |
| --- | --- |
| `[PAGE]` | The page to print, as Markdown: its path on the docs site, or its address. |

Examples:

```text
marfa docs search "restore an archive" --limit 5
marfa docs topics
marfa docs files
```

### marfa docs search

Search the docs, best match first: each page's title, address and a snippet.

```text
marfa docs search [OPTIONS] <QUERY>
```

| Argument | Description |
| --- | --- |
| `<QUERY>` | What to look for. |

| Option | Description |
| --- | --- |
| `--limit <N>` | How many pages at most, 1 to 50. Unset takes the site's own default. |

### marfa docs topics

Every docs page: its title, address and description.

```text
marfa docs topics [OPTIONS]
```
