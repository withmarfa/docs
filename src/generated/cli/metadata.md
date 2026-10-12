An item's tags and the namespaces it carries, and every tag in use.

```text
marfa metadata [OPTIONS] <COMMAND>
```

### marfa metadata get

An item's metadata: its tags and the namespaces it carries.

```text
marfa metadata get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

### marfa metadata replace

Write an item's tags whole, dropping any not named.

```text
marfa metadata replace [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--tag <TAG>` | A tag, repeatable; none at all clears them. |

### marfa metadata update

Add the named tags, leaving the rest.

```text
marfa metadata update [OPTIONS] --tag <TAG> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

| Option | Description |
| --- | --- |
| `--tag <TAG>` | A tag, repeatable. |

### marfa metadata tags

Every distinct tag in use on the instance.

```text
marfa metadata tags [OPTIONS]
```
