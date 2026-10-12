Sign in to a server as an app: a code the owner approves in the browser.

```text
marfa login [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--scope <SCOPE>` | The scopes to ask for. Defaults to everything an owner can hold that the server supports; the consent screen narrows it. |
| `--no-browser` | Print the page to open rather than opening it. |
| `--print-token` | Print the token set instead of keeping it in the keychain. |
| `--client-id <ID>` | The client id an earlier sign-in registered, where no keychain remembers it; without one the binary registers again. |
| `--name <NAME>` | The name this sign-in registers under, which is sent to the server and shown to its owner among their sign-ins. Defaults to `marfa on` and this machine's host name without its domain. Giving it registers the binary again. |
