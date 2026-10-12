Edges between items.

```text
marfa edges [OPTIONS] <COMMAND>
```

### marfa edges list

List edges on the server, a page at a time.

```text
marfa edges list [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--type <TYPE>` | Only edges of this type. |
| `--updated-after <TIME>` | Inclusive lower bound on the modification time: the catch-up filter. |
| `--updated-before <TIME>` | Exclusive upper bound on the modification time. |
| `--limit <LIMIT>` | How many at most. |
| `--cursor <CURSOR>` | The cursor the previous page answered with. |

### marfa edges get

One edge by id.

```text
marfa edges get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The edge id. |

### marfa edges create

Link two items with an edge.

```text
marfa edges create [OPTIONS] --source <ID> --target <ID> --type <TYPE>
```

| Option | Description |
| --- | --- |
| `--source <ID>` | The item the edge leaves. |
| `--target <ID>` | The item the edge arrives at. |
| `--type <TYPE>` | The edge type. |
| `--properties <JSON>` | The edge's properties, as a JSON object. |
| `--id <ID>` | The id to mint it under. Omitted, the server mints one. |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa edges update

Change an edge's properties, or move one of its ends, conditional on the version read.

```text
marfa edges update [OPTIONS] --version <VERSION> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The edge id. |

| Option | Description |
| --- | --- |
| `--properties <JSON>` | The properties, as a JSON object. Whole values. |
| `--source <ID>` | Move the edge to this source, where each target holds one of its type. |
| `--target <ID>` | Move the edge to this target, where each source holds one of its type. |
| `--version <VERSION>` | The version the edit was based on. |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa edges delete

Remove an edge.

```text
marfa edges delete [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The edge id. |

| Option | Description |
| --- | --- |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa edges bulk

Upsert many edges in one request.

```text
marfa edges bulk [OPTIONS] --file <PATH>
```

| Option | Description |
| --- | --- |
| `--file <PATH>` | A JSON file holding the edges, or the whole body with `edges` in it; `-` reads stdin. |
| `--mode <MODE>` | `upsert` or `create_only`. |
| `--atomic` | Refuse the whole request if any entry is refused. |
| `--no-fanout` | Do not deliver the writes to webhooks. |
