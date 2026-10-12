Export the instance's data.

```text
marfa export [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--format <FORMAT>` | `ndjson` for items one per line, `archive` for the whole instance. One of `ndjson`, `archive`. |
| `--output <PATH>` | Where to write. Omitted, the export goes to stdout. |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | One state, or `any`. One of `active`, `archived`, `trashed`, `revoked`, `any`. |
| `--source <SOURCE>` | The source the items were written under. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
