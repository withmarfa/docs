The audit log: every write, with the acting key. Needs `audit.read`.

```text
marfa audit [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--action <ACTION>` | Only entries with this action, such as `item.create`. |
| `--resource-type <TYPE>` | Only entries about this kind of resource. |
| `--resource-id <ID>` | Only entries about this resource. |
| `--created-after <TIME>` | Exclusive lower bound on the entry's time, RFC 3339. |
| `--created-before <TIME>` | Exclusive upper bound on the entry's time, RFC 3339. |
| `--limit <LIMIT>` | How many at most. |
| `--cursor <CURSOR>` | The cursor the previous page answered with. |
