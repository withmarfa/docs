The owner: the one account behind the sign-in surface.

```text
marfa owner [OPTIONS] <COMMAND>
```

### marfa owner show

Show the instance's owner.

```text
marfa owner show [OPTIONS]
```

### marfa owner recover

Recover the owner's password using private machine authority; revoke browser sessions.

```text
marfa owner recover [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--stdin` | Read a JSON object containing password from standard input instead of a hidden prompt. |
