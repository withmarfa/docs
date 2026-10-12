Every command accepts these.

| Option | Description |
| --- | --- |
| `--url <URL>` | The server's base URL. Falls back to MARFA_API_URL, then to the server a kept credential made current. |
| `--key <KEY>` | A key or a token for that server. Prefer MARFA_API_KEY or the keychain: a command line is readable by other users of the machine and stays in shell history. Falls back to MARFA_API_KEY, then to the keychain: the file MARFA_KEYCHAIN names, where it names one. |
| `--allow-http` | Send a credential over plain http to a host that is not this machine without the warning, for a network that is private. MARFA_ALLOW_HTTP=1 does the same. |
| `--socket <PATH>` | Use private local process authority through this Unix socket, without a keychain. |
| `--json` | Print the answer as JSON, and a refusal as one JSON object on stderr, after any warning, which is one plain line. |

`marfa` itself also accepts these.

| Option | Description |
| --- | --- |
| `-V, --version` | Print version. |
