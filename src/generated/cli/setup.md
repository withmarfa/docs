Claim a new instance, obtain a setup code, or open a browser handoff.

```text
marfa setup [OPTIONS] <COMMAND>
```

### marfa setup status

Show whether this instance has been claimed (private socket required).

```text
marfa setup status [OPTIONS]
```

### marfa setup code

Replace the setup code and invalidate earlier setup sessions (private socket required).

```text
marfa setup code [OPTIONS]
```

### marfa setup open

Issue a single-use browser handoff and open it (private socket required).

```text
marfa setup open [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--no-browser` | Print the handoff link without opening a browser. |

### marfa setup claim

Claim the instance. Password and remote setup code use hidden prompts or structured stdin.

```text
marfa setup claim [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--email <EMAIL>` | The owner's email address. Required when using terminal prompts. |
| `--name <NAME>` | The owner's display name. |
| `--stdin` | Read JSON containing email, password, optional name, and code for a remote claim. |
