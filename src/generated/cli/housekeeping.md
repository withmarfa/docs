The housekeeping jobs the server runs on itself. Explicit management permission required.

```text
marfa housekeeping [OPTIONS] <COMMAND>
```

### marfa housekeeping list

Every housekeeping job the server runs on itself: its cadence, when it is next due, and what its last run did. Requires `instance.read`.

```text
marfa housekeeping list [OPTIONS]
```

### marfa housekeeping run

Run one housekeeping job now and report what it did. Requires `instance.maintain`.

```text
marfa housekeeping run [OPTIONS] <NAME>
```

| Argument | Description |
| --- | --- |
| `<NAME>` | The housekeeping job's name, as `housekeeping list` shows it. |
