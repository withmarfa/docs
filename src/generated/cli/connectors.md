Processes that write on a key's behalf: registered, heard from, and reporting their runs. A key registers itself; `connectors.manage` sees every registration and may remove one.

```text
marfa connectors [OPTIONS] <COMMAND>
```

### marfa connectors register

Register the key this command runs under as a connector, or answer its registration if it has one: the key is the identity.

```text
marfa connectors register [OPTIONS] --name <NAME>
```

| Option | Description |
| --- | --- |
| `--name <NAME>` | What the connector is called. |
| `--description <DESCRIPTION>` | What it does. |

### marfa connectors list

Registered connectors, newest first: every one with `connectors.manage` or direct owner/local authority, otherwise the key's own.

```text
marfa connectors list [OPTIONS]
```

### marfa connectors get

One connector's registration.

```text
marfa connectors get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

### marfa connectors delete

Remove a registration. The connector's own key, or `connectors.manage`.

```text
marfa connectors delete [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

### marfa connectors heartbeat

Say the connector is alive. Its own key only.

```text
marfa connectors heartbeat [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

### marfa connectors report

Report one run of the connector. Its own key only.

```text
marfa connectors report [OPTIONS] --outcome <OUTCOME> --started-at <TIME> --finished-at <TIME> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

| Option | Description |
| --- | --- |
| `--outcome <OUTCOME>` | How the run ended. One of `succeeded`, `failed`. |
| `--started-at <TIME>` | When the run started, RFC 3339. |
| `--finished-at <TIME>` | When the run finished, RFC 3339. |
| `--summary <SUMMARY>` | What the run did, in a sentence. |
| `--error <ERROR>` | What went wrong, for a run that failed. |

### marfa connectors runs

The runs a connector has reported, newest first.

```text
marfa connectors runs [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

| Option | Description |
| --- | --- |
| `--limit <LIMIT>` | How many at most. |

### marfa connectors endpoints

The addresses a sender posts inbound webhooks to.

```text
marfa connectors endpoints [OPTIONS] <COMMAND>
```

### marfa connectors endpoints create

Make an endpoint. Its address is shown in full this once. The connector's own key, or `connectors.manage`.

```text
marfa connectors endpoints create [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

| Option | Description |
| --- | --- |
| `--label <LABEL>` | What the endpoint is for. |
| `--duplicate-header <HEADER>` | A header whose value names a delivery, such as X-GitHub-Delivery, so a repeat is marked as one. |

### marfa connectors endpoints list

A connector's endpoints, newest first, each address redacted.

```text
marfa connectors endpoints list [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

### marfa connectors endpoints retire

Retire an endpoint: its address stops answering.

```text
marfa connectors endpoints retire [OPTIONS] <ID> <ENDPOINT>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |
| `<ENDPOINT>` | The endpoint id. |

### marfa connectors deliveries

What arrived at a connector's endpoints. Its own key only.

```text
marfa connectors deliveries [OPTIONS] <COMMAND>
```

### marfa connectors deliveries list

A connector's deliveries, oldest first, the unhandled ones unless --state says otherwise.

```text
marfa connectors deliveries list [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

| Option | Description |
| --- | --- |
| `--state <STATE>` | Which deliveries: not yet handled, handled, or both. One of `pending`, `handled`, `any`. |
| `--endpoint <ENDPOINT>` | Only what this endpoint received. |
| `--limit <LIMIT>` | How many at most. |
| `--cursor <CURSOR>` | The cursor the previous page answered with. |

### marfa connectors deliveries body

A delivery's body, byte for byte.

```text
marfa connectors deliveries body [OPTIONS] <ID> <DELIVERY>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |
| `<DELIVERY>` | The delivery id. |

| Option | Description |
| --- | --- |
| `--output <PATH>` | Where to write the bytes. Omitted, they go to stdout. |

### marfa connectors deliveries handle

Mark deliveries handled. The first mark stands.

```text
marfa connectors deliveries handle [OPTIONS] --outcome <OUTCOME> <ID> <DELIVERIES>...
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |
| `<DELIVERIES>...` | The delivery ids. |

| Option | Description |
| --- | --- |
| `--outcome <OUTCOME>` | What the connector made of them. One of `processed`, `duplicate`, `rejected`. |

### marfa connectors hold

Take or renew the hold for one process, which alone may then write the state and the agreements. Its own key only.

```text
marfa connectors hold [OPTIONS] --process <PROCESS> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

| Option | Description |
| --- | --- |
| `--process <PROCESS>` | The process's own name for itself, such as a UUID. |

### marfa connectors release

Give up the hold, if this process holds it. Its own key only.

```text
marfa connectors release [OPTIONS] --process <PROCESS> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

| Option | Description |
| --- | --- |
| `--process <PROCESS>` | The process's own name for itself. |

### marfa connectors state

The state document a connector keeps on the instance.

```text
marfa connectors state [OPTIONS] <COMMAND>
```

### marfa connectors state get

The state document, `{}` until one is written. Its own key only.

```text
marfa connectors state get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

### marfa connectors state put

Replace the state document with a JSON object. Its own key only.

```text
marfa connectors state put [OPTIONS] --process <PROCESS> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

| Option | Description |
| --- | --- |
| `--process <PROCESS>` | The process writing, which must hold the registration. |
| `--problems <JSON>` | Current problems as a JSON object of messages. Omit to preserve them; `{}` clears them. |
| `--file <PATH>` | A file holding the JSON body; `-` reads stdin. |
| `--body <JSON>` | The JSON body inline. |

### marfa connectors state delete

Remove the state document, current problems and every agreement. The connector's own key, or `connectors.manage`.

```text
marfa connectors state delete [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

### marfa connectors agreements

A connector's records of what it and its vendor last agreed about rows. Its own key only.

```text
marfa connectors agreements [OPTIONS] <COMMAND>
```

### marfa connectors agreements write

Set and clear agreements, from a JSON object with `set` and `clear`.

```text
marfa connectors agreements write [OPTIONS] --process <PROCESS> <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

| Option | Description |
| --- | --- |
| `--process <PROCESS>` | The process writing, which must hold the registration. |
| `--file <PATH>` | A file holding the JSON body; `-` reads stdin. |
| `--body <JSON>` | The JSON body inline. |

### marfa connectors agreements lookup

The agreements of the rows named, each once, in the order first named.

```text
marfa connectors agreements lookup [OPTIONS] <ID> <ITEMS>...
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |
| `<ITEMS>...` | The item ids. |

### marfa connectors agreements list

The agreements, the one written longest ago first.

```text
marfa connectors agreements list [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The connector id. |

| Option | Description |
| --- | --- |
| `--waiting <WAITING>` | Only the ones waiting to be carried to the vendor, or only the others. One of `true`, `false`. |
| `--limit <LIMIT>` | How many at most. |
| `--cursor <CURSOR>` | The cursor the previous page answered with. |
