Sign-ins: every browser, app and key that can reach the server. A key or an app's token is refused; use --socket.

```text
marfa sign-ins [OPTIONS] <COMMAND>
```

### marfa sign-ins list

List every browser, app and key that can reach the server, each with its name, its kind and when it was last used. Needs direct local authority (--socket).

```text
marfa sign-ins list [OPTIONS]
```

### marfa sign-ins rename

Give an app or a key a new name. A key's name is its label; a browser's comes from the browser and can't be changed. Needs direct local authority (--socket).

```text
marfa sign-ins rename [OPTIONS] <ID> <NAME>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The sign-in's id. |
| `<NAME>` | The new name, which may start with `-`. |

### marfa sign-ins end

End a sign-in at once: its next request is refused, and an app can't refresh its tokens. What it wrote stays, and so do the keys an app minted unless --revoke-keys is given. Needs direct local authority (--socket).

```text
marfa sign-ins end [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The sign-in's id. |

| Option | Description |
| --- | --- |
| `--revoke-keys` | For an app, also revoke every key it minted. Refused for a browser or a key. |
