Outbound subscriptions that send events out. Every command needs `webhooks.manage`.

```text
marfa webhooks [OPTIONS] <COMMAND>
```

### marfa webhooks create

Register a subscription. The secret is answered once, in plaintext.

```text
marfa webhooks create [OPTIONS] --to <URL> --event <EVENT>
```

| Option | Description |
| --- | --- |
| `--to <URL>` | Where to deliver. Named `--to` rather than `--url`, which is the server. |
| `--event <EVENT>` | An event name from the vocabulary, repeatable; `*` is refused. |
| `--type-filter <TYPE>` | Only events for items of this type. |
| `--secret <SECRET>` | The secret deliveries are signed with. Omitted, the server mints one. |

### marfa webhooks list

Every subscription.

```text
marfa webhooks list [OPTIONS]
```

### marfa webhooks get

One subscription by id.

```text
marfa webhooks get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The webhook id. |

### marfa webhooks update

Change a subscription's URL, events, type filter or whether it is active.

```text
marfa webhooks update [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The webhook id. |

| Option | Description |
| --- | --- |
| `--to <URL>` | Where to deliver. Named `--to` rather than `--url`, which is the server. |
| `--event <EVENT>` | The events, whole; repeatable. |
| `--type-filter <TYPE>` | Only events for items of this type. |
| `--active` | Resume deliveries. |
| `--inactive` | Pause deliveries. |

### marfa webhooks delete

Remove a subscription.

```text
marfa webhooks delete [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The webhook id. |

### marfa webhooks deliveries

The deliveries a subscription was sent, newest first.

```text
marfa webhooks deliveries [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The webhook id. |

| Option | Description |
| --- | --- |
| `--limit <LIMIT>` | How many at most. |

### marfa webhooks redeliver

Queue a failed delivery again using the subscription's current address.

```text
marfa webhooks redeliver [OPTIONS] <ID> <DELIVERY_ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The webhook id. |
| `<DELIVERY_ID>` | The delivery id. |
