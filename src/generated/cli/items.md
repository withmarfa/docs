Items: create, read, change, tag, link, attach, and the bulk operations.

```text
marfa items [OPTIONS] <COMMAND>
```

### marfa items list

List items on the server, a page at a time.

```text
marfa items list [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | One state, or `any`. Unset answers the active state. One of `active`, `archived`, `trashed`, `revoked`, `any`. |
| `--source <SOURCE>` | The source the items were written under. |
| `--tier <TIER>` | One tier, or `all`. One of `library`, `feed`, `all`. |
| `--tag <TAG>` | Items must carry every tag given. |
| `--filter <FILTER>` | A property filter in the server's filter grammar. |
| `--sort <SORT>` | The field to order by; the server's default is the creation time. One of `created-at`, `updated-at`, `occurred-at`. |
| `--direction <DIRECTION>` | `asc` or `desc`; the server's default is newest first. One of `asc`, `desc`. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
| `--updated-after <TIME>` | Inclusive lower bound on the modification time: the catch-up filter. |
| `--updated-before <TIME>` | Exclusive upper bound on the modification time. |
| `--include <NAME>` | Extra to hydrate onto each item: `edges`, `metadata`. |
| `--limit <LIMIT>` | How many at most. |
| `--cursor <CURSOR>` | The cursor the previous page answered with. |

### marfa items get

One item by id.

```text
marfa items get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--include <LIST>` | Extra to hydrate onto the item: `edges`, `metadata`, or both comma-separated. |

### marfa items create

Create an item.

```text
marfa items create [OPTIONS] --type <TYPE>
```

| Option | Description |
| --- | --- |
| `--type <TYPE>` | The type the item is. |
| `--properties <JSON>` | The properties, as a JSON object. |
| `--prop <KEY=VALUE>` | One property as key=value, repeatable. The value is a string. |
| `--tag <TAG>` | A tag, repeatable. |
| `--tier <TIER>` | The tier to write it at; the server's default is the library. One of `library`, `feed`. |
| `--state <STATE>` | The state to create it in. One of `active`, `archived`, `trashed`, `revoked`. |
| `--occurred-at <TIME>` | The item's own time, RFC 3339. Defaults to now. |
| `--source <SOURCE>` | The source to key and stamp it with: the key's own, or one it claims. Any other is refused. |
| `--source-id <SOURCE_ID>` | The id this row has in the system it came from: the natural key. |
| `--id <ID>` | The id to mint it under. Omitted, the server mints one. |
| `--version <VERSION>` | The version this create is conditional on, where its natural key resolves a row the server already holds. |
| `--edges <JSON>` | Edges to write with it, as the JSON object the operation takes. |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa items update

Change an item's properties or fields, conditional on the version read.

```text
marfa items update [OPTIONS] --version <VERSION> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--version <VERSION>` | The version the edit was based on. Required: the server refuses an update that names no version. |
| `--properties <JSON>` | The properties, as a JSON object. |
| `--prop <KEY=VALUE>` | One property as key=value, repeatable. The value is a string. |
| `--replace` | Replace the properties whole instead of merging the ones given. |
| `--type <TYPE>` | Move the item to this type. |
| `--retype` | Let the type change even where the target type is enforced. |
| `--tier <TIER>` | The tier to move the item to. One of `library`, `feed`. |
| `--occurred-at <TIME>` | The item's own time, RFC 3339. |
| `--source-id <KEY>` | The natural key to move the row to. The server refuses one another item already holds. |
| `--edges <JSON>` | Edges to write with it, as the JSON object the operation takes. |
| `--conflict <CONFLICT>` | How a colliding write is settled: `auto` asks the server to resolve within its own transaction. One of `auto`, `manual`, `callback`. |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa items delete

Move an item to the bin.

```text
marfa items delete [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa items restore

Take an item out of the bin.

```text
marfa items restore [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa items transition

Move an item to another lifecycle state.

```text
marfa items transition [OPTIONS] --state <STATE> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--state <STATE>` | The state to move it to. One of `active`, `archived`, `trashed`. |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa items purge

Destroy a trashed item irrecoverably. Needs `items.purge`.

```text
marfa items purge [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa items versions

One page of the snapshots an item's history holds, oldest first. Pass the answer's `next_cursor` as `--cursor` for the next page.

```text
marfa items versions [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--limit <LIMIT>` | How many at most. |
| `--cursor <CURSOR>` | The cursor the previous page answered with. |

### marfa items tag

Put tags on an item.

```text
marfa items tag [OPTIONS] <ID> <TAGS>...
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |
| `<TAGS>...` | One or more tags. |

### marfa items untag

Take one tag off an item.

```text
marfa items untag [OPTIONS] <ID> <TAG>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |
| `<TAG>` | The tag to take off. |

### marfa items edges

The edges leaving an item.

```text
marfa items edges [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--type <TYPE>` | Only edges of this type. |
| `--limit <LIMIT>` | How many at most. |
| `--cursor <CURSOR>` | The cursor the previous page answered with. |

### marfa items backrefs

The edges arriving at an item.

```text
marfa items backrefs [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--type <TYPE>` | Only edges of this type. |
| `--limit <LIMIT>` | How many at most. |
| `--cursor <CURSOR>` | The cursor the previous page answered with. |

### marfa items add

Add a file as an item of its own: upload its bytes and create a file item for them.

```text
marfa items add [OPTIONS] <FILE>
```

| Argument | Description |
| --- | --- |
| `<FILE>` | The file to add. |

| Option | Description |
| --- | --- |
| `--mime-type <TYPE>` | The file's MIME type. Guessed from the extension when omitted. |
| `--title <TITLE>` | The file item's title. Defaults to the file's name. |
| `--type <TYPE>` | The file item's type. Defaults to `core.file`, or the image, audio or video subtype when the MIME type says. |
| `--tag <TAG>` | A tag, repeatable. |
| `--tier <TIER>` | The tier to write it at; the server's default is the library. One of `library`, `feed`. |

### marfa items attach

Attach a file: upload its bytes, create a file item for them, and link it to the target with an `attached-to` edge.

```text
marfa items attach [OPTIONS] <ID> <FILE>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item the file belongs to. |
| `<FILE>` | The file to attach. |

| Option | Description |
| --- | --- |
| `--mime-type <TYPE>` | The file's MIME type. Guessed from the extension when omitted. |
| `--title <TITLE>` | The file item's title. Defaults to the file's name. |
| `--type <TYPE>` | The file item's type. Defaults to `core.file`, or the image, audio or video subtype when the MIME type says. |

### marfa items stats

Item counts, by state or by type.

```text
marfa items stats [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--by <BY>` | What to count by. One of `state`, `type`. |

### marfa items occurrences

Occurrences of `core.event` items in a window.

```text
marfa items occurrences [OPTIONS] --from <TIME> --to <TIME>
```

| Option | Description |
| --- | --- |
| `--from <TIME>` | The window's start, RFC 3339. |
| `--to <TIME>` | The window's end, RFC 3339. |
| `--type <TYPE>` | A type identifier to narrow to. |

### marfa items bulk

Upsert many items in one request.

```text
marfa items bulk [OPTIONS] --file <PATH>
```

| Option | Description |
| --- | --- |
| `--file <PATH>` | A JSON file holding the items, or the whole body with `items` in it; `-` reads stdin. |
| `--mode <MODE>` | `upsert` or `create_only`. |
| `--atomic` | Refuse the whole request if any entry is refused. |
| `--no-fanout` | Do not deliver the writes to webhooks. |
| `--retype` | Let entries change the type of the rows they land on. |

### marfa items bulk-get

Read many items by id in one request.

```text
marfa items bulk-get [OPTIONS] <IDS>...
```

| Argument | Description |
| --- | --- |
| `<IDS>...` | The item ids. |

| Option | Description |
| --- | --- |
| `--include <NAME>` | Extra to hydrate onto each item: `edges`, `metadata`. |

### marfa items lookup

Items by link, natural key or id, in every state, with the tombstones purges left for the keys named.

```text
marfa items lookup [OPTIONS] --type <TYPE>
```

| Option | Description |
| --- | --- |
| `--type <TYPE>` | The type the links are held in and the tombstones kept under. |
| `--link <VALUE>` | A link value; repeat for more. |
| `--source <SOURCE>` | The source the `--source-id` natural keys are under. |
| `--source-id <ID>` | A natural key's `source_id`; repeat for more. |
| `--id <ID>` | An item id; repeat for more. |
| `--include <NAME>` | Extra to hydrate onto each item: `edges`. |

### marfa items tombstones

Settle the tombstones purges left at a later time.

```text
marfa items tombstones [OPTIONS] --type <TYPE> --settled-at <TIME>
```

| Option | Description |
| --- | --- |
| `--type <TYPE>` | The type the tombstones are kept under. |
| `--link <VALUE>` | A link value; repeat for more. |
| `--source <SOURCE>` | The source the `--source-id` natural keys are under. |
| `--source-id <ID>` | A natural key's `source_id`; repeat for more. |
| `--settled-at <TIME>` | The vendor-side change time, RFC 3339; one earlier than a tombstone holds leaves it as it is. |

### marfa items bulk-action

Apply one action to every item a filter selects, as a job.

```text
marfa items bulk-action [OPTIONS] <COMMAND>
```

### marfa items bulk-action transition

Move every matching item to a state.

```text
marfa items bulk-action transition [OPTIONS] --to <STATE>
```

| Option | Description |
| --- | --- |
| `--to <STATE>` | The state to move them to. One of `active`, `archived`, `trashed`. |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | One state. Unset excludes the bin, as a listing does; there is no `any` on this operation. One of `active`, `archived`, `trashed`, `revoked`. |
| `--source <SOURCE>` | The source the items were written under. |
| `--tier <TIER>` | One tier. One of `library`, `feed`. |
| `--tag <TAG>` | Items must carry every tag given. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
| `--filter <FILTER>` | A property filter in the server's filter grammar. |
| `--dry-run` | Report what the action would touch and touch nothing. |
| `--max-items <MAX_ITEMS>` | Refuse if more than this many items match. |
| `--no-fanout` | Do not deliver the writes to webhooks. |

### marfa items bulk-action purge

Destroy every matching item that is in the trash when the job reaches it; any other match is left as it is and reported. Match the bin with `--state trashed`. Needs `items.purge` and `--confirm PURGE`.

```text
marfa items bulk-action purge [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--confirm <PURGE>` | The word `PURGE`, because the operation asks for it out loud. |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | One state. Unset excludes the bin, as a listing does; there is no `any` on this operation. One of `active`, `archived`, `trashed`, `revoked`. |
| `--source <SOURCE>` | The source the items were written under. |
| `--tier <TIER>` | One tier. One of `library`, `feed`. |
| `--tag <TAG>` | Items must carry every tag given. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
| `--filter <FILTER>` | A property filter in the server's filter grammar. |
| `--dry-run` | Report what the action would touch and touch nothing. |
| `--max-items <MAX_ITEMS>` | Refuse if more than this many items match. |
| `--no-fanout` | Do not deliver the writes to webhooks. |

### marfa items bulk-action tags

Add tags to, and remove tags from, every matching item.

```text
marfa items bulk-action tags [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--add <TAG>` | A tag to add, repeatable. |
| `--remove <TAG>` | A tag to remove, repeatable. |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | One state. Unset excludes the bin, as a listing does; there is no `any` on this operation. One of `active`, `archived`, `trashed`, `revoked`. |
| `--source <SOURCE>` | The source the items were written under. |
| `--tier <TIER>` | One tier. One of `library`, `feed`. |
| `--tag <TAG>` | Items must carry every tag given. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
| `--filter <FILTER>` | A property filter in the server's filter grammar. |
| `--dry-run` | Report what the action would touch and touch nothing. |
| `--max-items <MAX_ITEMS>` | Refuse if more than this many items match. |
| `--no-fanout` | Do not deliver the writes to webhooks. |

### marfa items bulk-action tier

Move every matching item to a tier.

```text
marfa items bulk-action tier [OPTIONS] --to <TIER>
```

| Option | Description |
| --- | --- |
| `--to <TIER>` | The tier to move them to. One of `library`, `feed`. |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | One state. Unset excludes the bin, as a listing does; there is no `any` on this operation. One of `active`, `archived`, `trashed`, `revoked`. |
| `--source <SOURCE>` | The source the items were written under. |
| `--tier <TIER>` | One tier. One of `library`, `feed`. |
| `--tag <TAG>` | Items must carry every tag given. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
| `--filter <FILTER>` | A property filter in the server's filter grammar. |
| `--dry-run` | Report what the action would touch and touch nothing. |
| `--max-items <MAX_ITEMS>` | Refuse if more than this many items match. |
| `--no-fanout` | Do not deliver the writes to webhooks. |

### marfa items bulk-action properties

Merge a patch into every matching item's properties.

```text
marfa items bulk-action properties [OPTIONS] --patch <JSON>
```

| Option | Description |
| --- | --- |
| `--patch <JSON>` | The patch, as a JSON object. |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | One state. Unset excludes the bin, as a listing does; there is no `any` on this operation. One of `active`, `archived`, `trashed`, `revoked`. |
| `--source <SOURCE>` | The source the items were written under. |
| `--tier <TIER>` | One tier. One of `library`, `feed`. |
| `--tag <TAG>` | Items must carry every tag given. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
| `--filter <FILTER>` | A property filter in the server's filter grammar. |
| `--dry-run` | Report what the action would touch and touch nothing. |
| `--max-items <MAX_ITEMS>` | Refuse if more than this many items match. |
| `--no-fanout` | Do not deliver the writes to webhooks. |

### marfa items bulk-action occurred-at

Set every matching item's own time.

```text
marfa items bulk-action occurred-at [OPTIONS] --occurred-at <TIME>
```

| Option | Description |
| --- | --- |
| `--occurred-at <TIME>` | The time to set, RFC 3339. |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | One state. Unset excludes the bin, as a listing does; there is no `any` on this operation. One of `active`, `archived`, `trashed`, `revoked`. |
| `--source <SOURCE>` | The source the items were written under. |
| `--tier <TIER>` | One tier. One of `library`, `feed`. |
| `--tag <TAG>` | Items must carry every tag given. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
| `--filter <FILTER>` | A property filter in the server's filter grammar. |
| `--dry-run` | Report what the action would touch and touch nothing. |
| `--max-items <MAX_ITEMS>` | Refuse if more than this many items match. |
| `--no-fanout` | Do not deliver the writes to webhooks. |

### marfa items bulk-action job

A bulk-action job's state.

```text
marfa items bulk-action job [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The job id. |

### marfa items bulk-action cancel

Cancel a bulk-action job.

```text
marfa items bulk-action cancel [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The job id. |
