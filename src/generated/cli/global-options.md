Every command accepts these.

| Option | Description |
| --- | --- |
| `--profile <NAME>` | A profile in profiles.toml: a server, and where its key comes from. Not the owner's profile, which `marfa profile` changes. The file is ~/Library/Application Support/Marfa/profiles.toml on macOS, and $XDG_CONFIG_HOME/marfa/profiles.toml, else ~/.config/marfa/profiles.toml, elsewhere. Each profile is a section with a url line and, optionally, key_command: a program and its arguments, run without a shell, that prints the key. Without key_command, the key is the credential the keychain keeps for that server. The server and key come from the first of these that is given: --profile, which refuses --url and --key beside it and reads none of MARFA_API_URL, MARFA_API_KEY and MARFA_PROFILE; --url or --key, as below, without MARFA_PROFILE; MARFA_PROFILE, which refuses MARFA_API_URL and MARFA_API_KEY beside it; MARFA_API_URL and MARFA_API_KEY, then the keychain. A profile's key is sent only to its server, and no other key is. |
| `--url <URL>` | The server's base URL. Falls back to MARFA_API_URL, then to the server a kept credential made current. MARFA_PROFILE is not read beside it. A command that sends a key from --key or MARFA_API_KEY needs the URL named, and so does any command with the keychain off. |
| `--key <KEY>` | A key or a token for that server. Prefer MARFA_API_KEY or the keychain: a command line is readable by other users of the machine and stays in shell history. Falls back to MARFA_API_KEY, then to the keychain: the file MARFA_KEYCHAIN names, where it names one, unless the keychain is off. MARFA_PROFILE is not read beside it. |
| `--no-keychain` | Treat the keychain as absent: read nothing from it and write nothing to it, so the server and the key must come from --url, --key, MARFA_API_URL or MARFA_API_KEY, or a profile with a key_command. A command that needs to keep something refuses. MARFA_NO_KEYCHAIN=1 does the same. |
| `--allow-http` | Send a credential over plain http to a host that is not this machine without the warning, for a network that is private. MARFA_ALLOW_HTTP=1 does the same. |
| `--socket <PATH>` | Use private local process authority through this Unix socket, without a keychain. Item properties, edges, tags, search, counts, events and exports still need a key. `items summaries`, `items trash`, the `blobs` commands and bulk-action job status and cancel do not. |
| `--json` | Print the answer as JSON. A refusal is the last line of stderr, one JSON object, after any plain lines such as a warning or the write line. |

`marfa` itself also accepts these.

| Option | Description |
| --- | --- |
| `-V, --version` | Print version. |
