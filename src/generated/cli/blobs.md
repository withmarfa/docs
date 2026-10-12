Bytes stored by content hash, and the stores that hold them.

```text
marfa blobs [OPTIONS] <COMMAND>
```

### marfa blobs upload

Store a file's bytes by content hash.

```text
marfa blobs upload [OPTIONS] <FILE>
```

| Argument | Description |
| --- | --- |
| `<FILE>` | The file. |

| Option | Description |
| --- | --- |
| `--mime-type <TYPE>` | The file's MIME type. Guessed from the extension when omitted. |

### marfa blobs download

Fetch a blob's bytes.

```text
marfa blobs download [OPTIONS] <HASH>
```

| Argument | Description |
| --- | --- |
| `<HASH>` | The blob hash, `sha256:<hex>`. |

| Option | Description |
| --- | --- |
| `--output <PATH>` | Where to write the bytes. Omitted, they go to stdout. |

### marfa blobs url

A time-limited link that fetches a blob without the API in between.

```text
marfa blobs url [OPTIONS] <HASH>
```

| Argument | Description |
| --- | --- |
| `<HASH>` | The blob hash, `sha256:<hex>`. |

| Option | Description |
| --- | --- |
| `--ttl <TTL>` | How long the link lives, in seconds. |

### marfa blobs stores

Every store the instance has attached, and the copies a blob keeps at the least. Requires `blobs.manage`.

```text
marfa blobs stores [OPTIONS]
```

### marfa blobs locations

The stores recorded as holding one blob's bytes, and when each copy was last found intact.

```text
marfa blobs locations [OPTIONS] <HASH>
```

| Argument | Description |
| --- | --- |
| `<HASH>` | The blob hash, `sha256:<hex>`. |

### marfa blobs delete-location

Remove one store's copy of a blob, where enough live copies remain. Requires `blobs.manage`.

```text
marfa blobs delete-location [OPTIONS] --store <STORE> <HASH>
```

| Argument | Description |
| --- | --- |
| `<HASH>` | The blob hash, `sha256:<hex>`. |

| Option | Description |
| --- | --- |
| `--store <STORE>` | The store whose copy goes, as `blobs stores` names it. |

### marfa blobs orphans

The blobs the last orphan sweep found nothing referencing. Requires `blobs.manage`.

```text
marfa blobs orphans [OPTIONS]
```
