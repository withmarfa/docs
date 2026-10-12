The event stream, one frame per line.

```text
marfa events [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--type <TYPE>` | A type identifier to narrow to, repeatable up to ten; subtypes are included. |
| `--edges <EDGES>` | Whether edge events ride along: `all` (the default) or `none`. One of `all`, `none`. |
| `--from <CURSOR>` | Resume from this cursor, replaying what the log holds after it. |
| `--for <SECONDS>` | Stop after this many seconds. Unset, it reads until interrupted. |
