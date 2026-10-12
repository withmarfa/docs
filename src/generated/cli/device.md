A working copy of a slice of one server, in the store --db names.

```text
marfa device [OPTIONS] <COMMAND>
```

Every `marfa device` command accepts these.

| Option | Description |
| --- | --- |
| `--db <PATH>` | The working copy's database file. Environment variable: `MARFA_DB`. |
| `--reader` | Open the store to read only: never claim the writer role, never write, and refuse a path where no store has been made. |

### marfa device hydrate

Replace the local copy with the declared types at one tier, or both.

```text
marfa device hydrate [OPTIONS] --types <TYPE> --tier <TIER>
```

| Option | Description |
| --- | --- |
| `--types <TYPE>` | Comma-separated type identifiers, such as core.note,core.file. |
| `--tier <TIER>` | The tier to hold the slice at, or `all` for both. One of `library`, `feed`, `all`. |
| `--edge-type <TYPE>` | An edge type to hold whole: every edge of it the key reads, whichever ends the copy holds. Repeatable. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device pin

Hold one row by id whatever the slice says of it, read now and kept current, even after it leaves the slice.

```text
marfa device pin [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device unpin

Stop holding a row by id; one the slice does not take goes.

```text
marfa device unpin [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device catch-up

Apply every event since the last hydrate or catch-up.

```text
marfa device catch-up [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device follow

Hold the event stream open and apply each event as it arrives, printing a line for each that changed the copy.

```text
marfa device follow [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--for <SECONDS>` | Stop after this many seconds; without it, follow until interrupted. Either way it ends with its report. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device changes

Print a line each time another process saves to the store. Opens it to read, with or without `--reader`, so watching never takes the writer's place.

```text
marfa device changes [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--for <SECONDS>` | Stop after this many seconds; without it, watch until interrupted. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items

Read items from the local copy.

```text
marfa device items [OPTIONS] <COMMAND>
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items list

List items, newest first unless sorted otherwise.

```text
marfa device items list [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | Exactly one state. Unset answers the active state. One of `active`, `archived`, `trashed`, `revoked`. |
| `--all-states` | Every state, not just the active one. |
| `--tier <TIER>` | Only items at this tier. One of `library`, `feed`. |
| `--tag <TAG>` | Items must carry every tag given. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
| `--filter <EXPR>` | An expression in the server's listing grammar, answered as the server answers `filter`; a `backref` condition is refused. |
| `--beneath <ID>` | Only this item and what it reaches along `parent-of` edges. |
| `--sort <SORT>` | The time to order by. One of `created-at`, `updated-at`, `occurred-at`. Default: `created-at`. |
| `--direction <DIRECTION>` | Newest first, or oldest. One of `asc`, `desc`. Default: `desc`. |
| `--limit <LIMIT>` | How many items at most. |
| `--offset <OFFSET>` | How many items to skip first. |
| `--folder <ID>` | Only what this `system.folder`'s search holds, as the folder holds it; refused where the copy's slice cannot answer the search whole. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items get

One item by id, with its properties and tags.

```text
marfa device items get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items create

Write a new item into the local copy and queue it for the server.

```text
marfa device items create [OPTIONS] --type <TYPE> --properties <JSON>
```

| Option | Description |
| --- | --- |
| `--type <TYPE>` | The type the item is. |
| `--properties <JSON>` | The properties, as a JSON object. |
| `--tag <TAG>` | A tag, repeatable. Each is queued as a write of its own. |
| `--tier <TIER>` | The tier to write it at; the default is the tier of the held row its natural key names, else the slice's tier, or the library from a slice of both or before a first hydration. One of `library`, `feed`. |
| `--source <SOURCE>` | The source to stamp it with. |
| `--source-id <SOURCE_ID>` | The id this row has in the system it came from. |
| `--occurred-at <OCCURRED_AT>` | The item's own time, RFC 3339. Defaults to now. |
| `--id <ID>` | The id to mint it under. Omitted, the device mints one. |
| `--version <VERSION>` | The version this create is conditional on, where its natural key resolves a row the server already holds. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items update

Change an item in the local copy and queue the change.

```text
marfa device items update [OPTIONS] --properties <JSON> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--properties <JSON>` | The properties to write, as a JSON object. Whole values. |
| `--version <VERSION>` | The version the edit was based on. Required: the device refuses an update that names no version, as the server does. |
| `--source-id <KEY>` | The natural key to move the row to. The server refuses one another item already holds, so a rename does not take a name off a note. |
| `--as-read` | The version is one read before the version the copy holds now, and the server merges the edit against it rather than taking it as newer than what came in since. |
| `--type <TYPE>` | The type to move the item to. The server holds its properties to the type it enters. |
| `--tier <TIER>` | The tier to move the item to. One of `library`, `feed`. |
| `--replace` | The properties are the item's whole properties: one they leave out is cleared rather than kept. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items delete

Move an item to the bin locally and queue the delete.

```text
marfa device items delete [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items purge

Destroy an item in the bin on the server now, and take it out of the local copy. Never queued: it needs the server, a key holding `items.purge` and write on the item's type, and an item the copy holds in the bin with no write to it waiting.

```text
marfa device items purge [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--version <VERSION>` | The version the item was read at in the bin; without it the copy's own, and an item the copy does not hold is refused. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items bin

Read a page of the server's bin, newest change first. Online only, and held nowhere in the copy; each item's `updated_at` stands for when it went to the bin.

```text
marfa device items bin [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--cursor <CURSOR>` | Where the page starts, as the last page's `next_cursor` named it. |
| `--limit <LIMIT>` | How many items at most, up to 100. Default: `50`. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items restore

Take an item out of the bin and queue the restore: locally where the copy holds it, and by id where it does not.

```text
marfa device items restore [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items transition

Move an item to another lifecycle state.

```text
marfa device items transition [OPTIONS] --state <STATE> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--state <STATE>` | The state to move it to. `revoked` is the server's alone. One of `active`, `archived`, `trashed`, `revoked`. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items add

Add a file as an item of its own: its upload and a file item naming the bytes, two queued writes, and one for each tag.

```text
marfa device items add [OPTIONS] <FILE>
```

| Argument | Description |
| --- | --- |
| `<FILE>` | The file to add. |

| Option | Description |
| --- | --- |
| `--mime-type <MIME_TYPE>` | The MIME type; the default comes from the file's extension. |
| `--title <TITLE>` | The file item's title; the default is the file's name. |
| `--type <TYPE>` | The file item's type; the default comes from the MIME type. |
| `--tag <TAG>` | A tag, repeatable. Each is queued as a write of its own. |
| `--tier <TIER>` | The tier to write the file item at. One of `library`, `feed`. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items attach

Attach a file to an item: its upload, a file item naming the bytes, and an `attached-to` edge, three queued writes.

Answers the text that embeds the file in the item's body, `![[title]]`, where the file's title names it alone among the item's attachments. Under --json the answer is one object: `upload`, `item` and `edge`, each a queued write, and `embed`, the text or null.

```text
marfa device items attach [OPTIONS] <ID> <FILE>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item to attach the file to. |
| `<FILE>` | The file to attach. |

| Option | Description |
| --- | --- |
| `--mime-type <MIME_TYPE>` | The MIME type; the default comes from the file's extension. |
| `--title <TITLE>` | The file item's title; the default is the file's name. |
| `--type <TYPE>` | The file item's type; the default comes from the MIME type. |
| `--tier <TIER>` | The tier to write the file item at. One of `library`, `feed`. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items links

The links and embeds of files in an item's body, read from the local copy: each with the item it names, or why it names none yet.

```text
marfa device items links [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items embed

The text that embeds a file item in an item's body, which reads back as the file's `attached-to` edge to the item.

```text
marfa device items embed [OPTIONS] <ID> <FILE>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item whose body the embed goes in. |
| `<FILE>` | The file item to embed. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device items thumbnail

The thumbnail an item carries, read from the local copy with no request: its MIME type and size, and its bytes written to `--out`.

```text
marfa device items thumbnail [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--out <FILE>` | Where to write the image's bytes. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device folders

Folders' settings: read from the copy, written through the folder operations.

```text
marfa device folders [OPTIONS] <COMMAND>
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device folders create

Create a folder's settings through the folder operations, at once and never queued; settings no folder follows are refused before they are sent.

```text
marfa device folders create [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--file <PATH>` | A file holding the settings as a JSON object; `-` reads stdin. |
| `--body <JSON>` | The settings as a JSON object, inline. |
| `--title <TITLE>` | The folder's name. |
| `--search <JSON>` | Which items the folder holds, as a JSON object: `types`, `tier`, `state`, `filter` and `beneath`. |
| `--defaults <JSON>` | What a new file takes where it leaves a blank, as a JSON object: `type`, `tier`, `properties`, `tags` and `edges`. |
| `--include <PATTERN>` | A gitignore pattern for the paths the folder takes, repeatable; a dot-led path only where a pattern names it, and never a secret. |
| `--ignore <PATTERN>` | A gitignore pattern for the paths the folder leaves alone, repeatable; it wins over an include pattern. |
| `--first-placement <TYPE=DIR>` | Where a new item of a type made elsewhere first appears, as TYPE=DIR relative to the folder's root, repeatable. |
| `--removal-threshold <JSON>` | When a removal pauses, as a JSON object: `files` and `fraction`. |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device folders change

Change a folder's settings through the folder operations, at once, each named one replaced whole.

```text
marfa device folders change [OPTIONS] --version <VERSION> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The folder's `system.folder` id. |

| Option | Description |
| --- | --- |
| `--version <VERSION>` | The version the change was based on. |
| `--file <PATH>` | A file holding the settings as a JSON object; `-` reads stdin. |
| `--body <JSON>` | The settings as a JSON object, inline. |
| `--title <TITLE>` | The folder's name. |
| `--search <JSON>` | Which items the folder holds, as a JSON object: `types`, `tier`, `state`, `filter` and `beneath`. |
| `--defaults <JSON>` | What a new file takes where it leaves a blank, as a JSON object: `type`, `tier`, `properties`, `tags` and `edges`. |
| `--include <PATTERN>` | A gitignore pattern for the paths the folder takes, repeatable; a dot-led path only where a pattern names it, and never a secret. |
| `--ignore <PATTERN>` | A gitignore pattern for the paths the folder leaves alone, repeatable; it wins over an include pattern. |
| `--first-placement <TYPE=DIR>` | Where a new item of a type made elsewhere first appears, as TYPE=DIR relative to the folder's root, repeatable. |
| `--removal-threshold <JSON>` | When a removal pauses, as a JSON object: `files` and `fraction`. |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device folders revoke

Retire a folder's settings through the folder operations, at once. A revoked folder does not change.

```text
marfa device folders revoke [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The folder's `system.folder` id. |

| Option | Description |
| --- | --- |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device folders get

A folder's settings as the copy holds them.

```text
marfa device folders get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The folder's `system.folder` id. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device search

Full-text search over the local copy, best match first.

```text
marfa device search [OPTIONS] <QUERY>
```

| Argument | Description |
| --- | --- |
| `<QUERY>` | Words to look for, matched as the server matches them: all must match, the last as a prefix, and a query in double quotes is a phrase. |

| Option | Description |
| --- | --- |
| `--state <STATE>` | Exactly one state. Unset answers the active state. One of `active`, `archived`, `trashed`, `revoked`. |
| `--all-states` | Every state, not just the active one. |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--tag <TAG>` | Hits must carry every tag given. |
| `--filter <EXPR>` | An expression in the server's listing grammar, answered as the server answers `filter`; a `backref` condition is refused. |
| `--beneath <ID>` | Only this item and what it reaches along `parent-of` edges. |
| `--limit <LIMIT>` | How many hits at most. Default: `20`. |
| `--folder <ID>` | Only what this `system.folder`'s search holds, as the folder holds it; refused where the copy's slice cannot answer the search whole. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device queue

Every queued write, the body it carries and what became of it.

```text
marfa device queue [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device drain

Send what the queue holds and record what came back.

One pass. A write that met a network rather than an answer is left where it was, uncounted, for the next drain.

```text
marfa device drain [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device forget

Clear the writes the server has answered.

A queue nobody empties makes every later write slower. Blocked and dead rows stay, because a caller may still release them, and so does a refused write that carried content, until it is discarded.

```text
marfa device forget [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device discard

Take a refused write out of the queue, with the content it carried.

The one way a refused create, edit, metadata, extension or edge write leaves the queue. A write still waiting on it keeps it.

```text
marfa device discard [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The refused write to discard. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device release

Send a blocked or dead write again, under a fresh key.

```text
marfa device release [OPTIONS] [ID]
```

| Argument | Description |
| --- | --- |
| `[ID]` | The queued write to release. |

| Option | Description |
| --- | --- |
| `--reason <REASON>` | Release every write blocked for this reason instead of one by id. One of `credential_refused`, `key_spent`, `ancestor_unavailable`, `conflict_unresolved`, `awaiting_dependency`. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device withdraw

Take a write blocked `ancestor_unavailable` or `conflict_unresolved` out of the queue, and put the copy back to what the server holds.

Sent again, such a write is refused the same way under any key. The writes held for it are refused unsent.

```text
marfa device withdraw [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The queued write to withdraw. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device status

What the local copy holds and where it came from.

```text
marfa device status [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device types

The item types the copy holds, read from it alone, the ones an app declares for it, and the server's.

```text
marfa device types [OPTIONS] <COMMAND>
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device types list

Every one the copy holds, by id.

```text
marfa device types list [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device types served

Every one the server holds, read from it now, so a slice can be chosen before a first hydration. The copy is left as it is.

```text
marfa device types served [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device types get

One by id; a type inherits the fields of the types above it.

```text
marfa device types get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The id, such as `core.note`. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device types declare

Declare the types this app saves, so a copy with no server checks what it queues against them and a hydration registers the ones the instance lacks, where the key may.

Marfa's own types need no declaring. The call is the app's whole set, so it replaces every earlier declaration.

```text
marfa device types declare [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--definitions <JSON>` | A type definition, or an array of them, as JSON. |
| `--file <PATH>` | A file holding the same. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device types declared

The declarations this copy holds, with the empty `fields` and the `version` a registration needs filled in.

```text
marfa device types declared [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edge-types

The edge types the copy holds, read from it alone, and the server's.

```text
marfa device edge-types [OPTIONS] <COMMAND>
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edge-types list

Every one the copy holds, by id.

```text
marfa device edge-types list [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edge-types served

Every one the server holds, read from it now, so a slice can be chosen before a first hydration. The copy is left as it is.

```text
marfa device edge-types served [OPTIONS]
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edge-types get

One by id; a type inherits the fields of the types above it.

```text
marfa device edge-types get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The id, such as `core.note` or `parent-of`. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edges

Edges between items, each its own write.

```text
marfa device edges [OPTIONS] <COMMAND>
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edges list

The edges the copy holds from one item.

```text
marfa device edges list [OPTIONS] <ITEM>
```

| Argument | Description |
| --- | --- |
| `<ITEM>` | The item the edges start from. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edges to

The edges the copy holds to one item.

```text
marfa device edges to [OPTIONS] <ITEM>
```

| Argument | Description |
| --- | --- |
| `<ITEM>` | The item the edges point at. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edges create

Link two items, and queue the edge.

```text
marfa device edges create [OPTIONS] --source <ID> --target <ID> --type <TYPE>
```

| Option | Description |
| --- | --- |
| `--source <ID>` | The item the edge starts from. |
| `--target <ID>` | The item the edge points at. |
| `--type <TYPE>` | The edge type. |
| `--properties <JSON>` | The edge's properties, as a JSON object. Default: `{}`. |
| `--id <ID>` | The id to mint it under. Omitted, the device mints one. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edges update

Change an edge's properties.

```text
marfa device edges update [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The edge id. |

| Option | Description |
| --- | --- |
| `--properties <JSON>` | The properties to write, as a JSON object. Whole values. Default: `{}`. |
| `--version <VERSION>` | The version the edit was based on. Required, as on an item. |
| `--source <ID>` | Move the edge to this source, where each target holds one of its type. |
| `--target <ID>` | Move the edge to this target, where each source holds one of its type. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device edges delete

Drop an edge locally and queue the delete.

```text
marfa device edges delete [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The edge id. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device tags

Tags on an item, each its own write.

```text
marfa device tags [OPTIONS] <COMMAND>
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device tags add

Put one tag on an item.

```text
marfa device tags add [OPTIONS] <ITEM> <TAG>
```

| Argument | Description |
| --- | --- |
| `<ITEM>` | The item id. |
| `<TAG>` | The tag. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device tags remove

Take one tag off an item.

```text
marfa device tags remove [OPTIONS] <ITEM> <TAG>
```

| Argument | Description |
| --- | --- |
| `<ITEM>` | The item id. |
| `<TAG>` | The tag. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device metadata

An item's metadata, written whole or merged.

```text
marfa device metadata [OPTIONS] <COMMAND>
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device metadata replace

Write the item's tags whole, dropping any not named.

```text
marfa device metadata replace [OPTIONS] <ITEM>
```

| Argument | Description |
| --- | --- |
| `<ITEM>` | The item id. |

| Option | Description |
| --- | --- |
| `--tag <TAG>` | A tag, repeatable. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device metadata merge

Add the named tags, leaving the rest.

```text
marfa device metadata merge [OPTIONS] <ITEM>
```

| Argument | Description |
| --- | --- |
| `<ITEM>` | The item id. |

| Option | Description |
| --- | --- |
| `--tag <TAG>` | A tag, repeatable. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device extensions

An item's extension namespaces, each its own write.

```text
marfa device extensions [OPTIONS] <COMMAND>
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device extensions write

Write one extension namespace.

```text
marfa device extensions write [OPTIONS] <ITEM> <NAMESPACE>
```

| Argument | Description |
| --- | --- |
| `<ITEM>` | The item id. |
| `<NAMESPACE>` | The extension namespace. |

| Option | Description |
| --- | --- |
| `--body <JSON>` | The namespace's contents, as a JSON object. Default: `{}`. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device extensions delete

Remove one extension namespace.

```text
marfa device extensions delete [OPTIONS] <ITEM> <NAMESPACE>
```

| Argument | Description |
| --- | --- |
| `<ITEM>` | The item id. |
| `<NAMESPACE>` | The extension namespace. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device blobs

Blobs' bytes: uploaded as queued writes, fetched when asked for.

```text
marfa device blobs [OPTIONS] <COMMAND>
```

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device blobs put

Hold a file's bytes beside the store and queue their upload.

```text
marfa device blobs put [OPTIONS] <FILE>
```

| Argument | Description |
| --- | --- |
| `<FILE>` | The file to upload. |

| Option | Description |
| --- | --- |
| `--mime-type <MIME_TYPE>` | The MIME type to send them under; the default comes from the file's extension. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.

### marfa device blobs get

Print where a blob's bytes are held, fetching them first where the store does not hold them yet.

```text
marfa device blobs get [OPTIONS] <HASH>
```

| Argument | Description |
| --- | --- |
| `<HASH>` | The blob's hash, `sha256:<hex>`. |

Also accepts the options of `marfa device`: `--db <PATH>` and `--reader`.
