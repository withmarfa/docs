Keys: the credentials that reach the API.

```text
marfa keys [OPTIONS] <COMMAND>
```

### marfa keys create

Mint a key. Needs `keys.mint` or direct owner/local authority.

The key holds exactly what the flags name. A permission, a map entry or a claim each names a part of what it holds, and a part left unnamed is held as nothing. With none named, the key takes the caller's whole set.

```text
marfa keys create [OPTIONS] --label <LABEL> --source <SOURCE>
```

| Option | Description |
| --- | --- |
| `--label <LABEL>` | What the key is for. |
| `--source <SOURCE>` | The key's own source, which a row written under the key is keyed by and stamped with unless the write names one the key claims. |
| `--permission <PERMISSION>` | A permission, repeatable. One of `schema.write`, `keys.mint`, `items.purge`, `webhooks.manage`, `config.manage`, `audit.read`, `grants.manage`, `instance.read`, `instance.maintain`, `connectors.manage`, `blobs.manage`, `keys.manage`. |
| `--type-permission <PATTERN=LEVEL>` | A type pattern and its level, `core.note=write`, repeatable. |
| `--extension-permission <NAMESPACE=LEVEL>` | An extension namespace and its level, `app.cursor=write`, repeatable. |
| `--edge-permission <TYPE=LEVEL>` | An edge type and its level, `references=write`, repeatable. |
| `--metadata-permission <NAME=LEVEL>` | A kind of registration and its level, `types=write` or `edge_types=write`, repeatable. |
| `--profile-permission <FIELD=LEVEL>` | A profile field and its level, `email=read`, repeatable. |
| `--enforcement-override <JSON>` | The enforcement override, as the JSON object the operation takes. |
| `--claim <SOURCE>` | A source a write under the key may name, so its rows are keyed by it. Repeatable. |
| `--no-claims` | Claim no source besides the key's own, asked for out loud. On a mint naming no permission or map, naming the claims is naming what the key holds: it holds no map and no permission either. |
| `--default-tier <DEFAULT_TIER>` | The tier a write under the key lands at when it names none. One of `library`, `feed`. |
| `--expires-in <DURATION>` | Stop the key working this long from now: a whole number and a unit, `s`, `m`, `h`, `d` or `w`, such as `90m` or `7d`. Measured on this machine's clock. |
| `--expires-at <TIME>` | Stop the key working at this time, as an RFC 3339 time such as `2030-01-31T12:00:00Z`. |
| `--no-permissions` | A key that holds nothing at all, asked for out loud. |

### marfa keys list

List key metadata. Needs `keys.manage`, `keys.mint` (the keys within the caller's reach) or direct owner/local authority.

```text
marfa keys list [OPTIONS]
```

### marfa keys current

The key this call bears, without plaintext: what it holds and what it claims. Any key may read itself.

```text
marfa keys current [OPTIONS]
```

### marfa keys update

Change a key's label, tier, expiry or permission maps. Needs `keys.manage`, `keys.mint` (a key within the caller's reach) or direct owner/local authority.

```text
marfa keys update [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The key id. |

| Option | Description |
| --- | --- |
| `--label <LABEL>` | What the key is for. |
| `--permission <PERMISSION>` | A permission, repeatable. One of `schema.write`, `keys.mint`, `items.purge`, `webhooks.manage`, `config.manage`, `audit.read`, `grants.manage`, `instance.read`, `instance.maintain`, `connectors.manage`, `blobs.manage`, `keys.manage`. |
| `--type-permission <PATTERN=LEVEL>` | A type pattern and its level, `core.note=write`, repeatable. |
| `--extension-permission <NAMESPACE=LEVEL>` | An extension namespace and its level, `app.cursor=write`, repeatable. |
| `--edge-permission <TYPE=LEVEL>` | An edge type and its level, `references=write`, repeatable. |
| `--metadata-permission <NAME=LEVEL>` | A kind of registration and its level, `types=write` or `edge_types=write`, repeatable. |
| `--profile-permission <FIELD=LEVEL>` | A profile field and its level, `email=read`, repeatable. |
| `--enforcement-override <JSON>` | The enforcement override, as the JSON object the operation takes. |
| `--no-type-permissions` | Empty the type permission map on this update. |
| `--no-extension-permissions` | Empty the extension permission map on this update. |
| `--no-edge-permissions` | Empty the edge permission map on this update. |
| `--no-metadata-permissions` | Empty the metadata permission map on this update. |
| `--no-profile-permissions` | Empty the profile permission map on this update. |
| `--claim <SOURCE>` | A source a write under the key may name, so its rows are keyed by it. Repeatable. |
| `--no-claims` | Claim no source besides the key's own, asked for out loud. On a mint naming no permission or map, naming the claims is naming what the key holds: it holds no map and no permission either. |
| `--default-tier <DEFAULT_TIER>` | The tier a write under the key lands at when it names none. One of `library`, `feed`. |
| `--expires-in <DURATION>` | Stop the key working this long from now: a whole number and a unit, `s`, `m`, `h`, `d` or `w`, such as `90m` or `7d`. Measured on this machine's clock. |
| `--expires-at <TIME>` | Stop the key working at this time, as an RFC 3339 time such as `2030-01-31T12:00:00Z`. |
| `--no-expiry` | Clear the key's expiry, so it never expires. |
| `--no-permissions` | Take every permission and every map from the key, so a key minted too wide is narrowed in place. |

### marfa keys revoke

Revoke a key; the next request bearing it is refused. Needs `keys.manage`, `keys.mint` (a key within the caller's reach) or direct owner/local authority.

```text
marfa keys revoke [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The key id. |

### marfa keys keep

Keep a key for this server in the operating system's keychain, and make this server the one a bare command talks to. The key is read from MARFA_API_KEY or from stdin, or from `--key`, which other users of the machine can read in the process list; never from a file.

```text
marfa keys keep [OPTIONS]
```

### marfa keys forget

Forget the key kept for this server.

```text
marfa keys forget [OPTIONS]
```
