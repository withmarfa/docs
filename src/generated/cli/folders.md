Folders on this machine, a directory that holds a slice as files, and their settings on the server.

```text
marfa folders [OPTIONS] <COMMAND>
```

### marfa folders add

Make a directory a folder that follows a `system.folder`'s settings, which `folders create` makes. Needs read on `system.folder`.

```text
marfa folders add [OPTIONS] --folder <ID> <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The directory. It is made if it is not there. |

| Option | Description |
| --- | --- |
| `--folder <ID>` | The folder's `system.folder` id. |
| `--yes` | Confirm the first sync without asking, for scripts. Without it, the add says what the first sync will do and waits for a go-ahead. |

### marfa folders list

List the folders on this machine, as its registry holds them. The registry is the file MARFA_FOLDER_REGISTRY names, where it names one.

```text
marfa folders list [OPTIONS]
```

### marfa folders remove

Take a folder off this machine: its own state under `.marfa` goes, and its files stay as plain files. Empty administrative directories remain. Refused while writes wait, except for a first sync still waiting to be confirmed, which this cancels. A folder whose directory is gone is taken off the list.

```text
marfa folders remove [OPTIONS] <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The folder. |

### marfa folders status

Say where every file in the folder stands, from its own store, asking the server nothing.

```text
marfa folders status [OPTIONS] <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The folder. |

### marfa folders confirm

Let a folder's first sync go, or a paused large removal: its deletes are queued, and files whose items left elsewhere are taken away.

```text
marfa folders confirm [OPTIONS] <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The folder. |

### marfa folders restore

Cancel a paused large removal: files gone from the disk are written back, and items that left elsewhere are restored.

```text
marfa folders restore [OPTIONS] <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The folder. |

### marfa folders hydrate

Pull what the folder's search needs into its working copy.

```text
marfa folders hydrate [OPTIONS] <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The folder. |

### marfa folders scan

Read the folder and queue what has changed. Sends nothing.

```text
marfa folders scan [OPTIONS] <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The folder. |

### marfa folders pull

Write what the folder's search matches out as files.

```text
marfa folders pull [OPTIONS] <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The folder. |

### marfa folders push

Scan, drain, catch up, pull, and send the placements the pull queued: everything a folder does, once.

```text
marfa folders push [OPTIONS] <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The folder. |

### marfa folders create

Create a folder's settings on the server, as a `system.folder`. Needs write on `system.folder`.

```text
marfa folders create [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--file <PATH>` | A file holding the settings as a JSON object; `-` reads stdin. |
| `--body <JSON>` | The settings as a JSON object, inline. |
| `--title <TITLE>` | The folder's name. |
| `--search <JSON>` | Which items the folder holds, as a JSON object: `types`, `tier`, `state`, `filter` and `beneath`. |
| `--defaults <JSON>` | What a new file takes where it leaves a blank, as a JSON object: `type`, `tier`, `properties`, `tags` and `edges`. |
| `--include <PATTERN>` | A gitignore pattern for the paths the folder takes, repeatable; a dot-led path only where a pattern names it, and never a secret. |
| `--ignore <PATTERN>` | A gitignore pattern for the paths the folder leaves alone, repeatable; it wins over an include pattern. |
| `--first-placement <TYPE=DIR>` | Where a new item of a type made elsewhere first appears, as TYPE=DIR relative to the folder's root, repeatable. |
| `--removal-threshold <JSON>` | When a removal pauses, as a JSON object: `files` and `fraction`. |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa folders change

Change a folder's settings on the server, each named one replaced whole.

```text
marfa folders change [OPTIONS] --version <VERSION> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The folder's `system.folder` id. |

| Option | Description |
| --- | --- |
| `--version <VERSION>` | The version the change was based on. |
| `--file <PATH>` | A file holding the settings as a JSON object; `-` reads stdin. |
| `--body <JSON>` | The settings as a JSON object, inline. |
| `--title <TITLE>` | The folder's name. |
| `--search <JSON>` | Which items the folder holds, as a JSON object: `types`, `tier`, `state`, `filter` and `beneath`. |
| `--defaults <JSON>` | What a new file takes where it leaves a blank, as a JSON object: `type`, `tier`, `properties`, `tags` and `edges`. |
| `--include <PATTERN>` | A gitignore pattern for the paths the folder takes, repeatable; a dot-led path only where a pattern names it, and never a secret. |
| `--ignore <PATTERN>` | A gitignore pattern for the paths the folder leaves alone, repeatable; it wins over an include pattern. |
| `--first-placement <TYPE=DIR>` | Where a new item of a type made elsewhere first appears, as TYPE=DIR relative to the folder's root, repeatable. |
| `--removal-threshold <JSON>` | When a removal pauses, as a JSON object: `files` and `fraction`. |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa folders revoke

Retire a folder's settings on the server. A revoked folder does not change.

```text
marfa folders revoke [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The folder's `system.folder` id. |

| Option | Description |
| --- | --- |
| `--idempotency-key <KEY>` | Sent as `Idempotency-Key`, so a repeat is answered from the record rather than written twice. |

### marfa folders watch

Watch a folder and keep it in step.

```text
marfa folders watch [OPTIONS] <DIR>
```

| Argument | Description |
| --- | --- |
| `<DIR>` | The directory to watch, recursively. |

| Option | Description |
| --- | --- |
| `--for <SECONDS>` | Stop after this long. Unset, it runs until interrupted. |
