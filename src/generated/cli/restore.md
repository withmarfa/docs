Restore an archive with direct owner or local authority.

Preserves item and edge IDs, created_at and updated_at dates, current versions, tags, extensions, and the item's earlier versions carried in the archive. Existing items and their history remain unchanged.

The archive contains only data the exporting credential could read, including history allowed by each snapshot's type permissions and blobs that credential could read. It does not restore keys, webhooks, or configuration. Trashed items are absent unless explicitly exported, for example with `export --format archive --state any`.

Until the first public release, restore only with the server build that wrote the archive. Archive format 0 does not promise compatibility between builds.

```text
marfa restore [OPTIONS] <FILE>
```

| Argument | Description |
| --- | --- |
| `<FILE>` | The archive, as `export --format archive` wrote it. |
