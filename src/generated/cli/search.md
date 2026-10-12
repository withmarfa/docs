Full-text search on the server, best match first.

```text
marfa search [OPTIONS] <QUERY>
```

| Argument | Description |
| --- | --- |
| `<QUERY>` | What to look for. |

| Option | Description |
| --- | --- |
| `--type <TYPE>` | A type identifier; its subtypes are included. |
| `--state <STATE>` | One state, or `any`. Unset answers the active state. One of `active`, `archived`, `trashed`, `revoked`, `any`. |
| `--tier <TIER>` | One tier, or `all`. One of `library`, `feed`, `all`. |
| `--tag <TAG>` | Hits must carry every tag given. |
| `--filter <FILTER>` | A property filter in the server's filter grammar. |
| `--occurred-after <TIME>` | Exclusive lower bound on the item's own time, RFC 3339. |
| `--occurred-before <TIME>` | Exclusive upper bound on the item's own time, RFC 3339. |
| `--include <NAME>` | Extra to hydrate onto each hit: `edges`, `metadata`. |
| `--limit <LIMIT>` | How many at most. |
| `--cursor <CURSOR>` | The cursor the previous page answered with. |
