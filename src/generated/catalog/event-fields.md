## Item event fields

| Field           | Kind                                           | Description                                                                                                                                                                        |
| --------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event_type`    | `string`                                       | The event, which is also the frame's `event:`.                                                                                                                                     |
| `item`          | [`Item`](/catalog/items#fields-every-item-has) | The item after the change. On `item.trashed` and `item.purged` of an item a cascade trashed, it carries `trashed_by_cascade`, and `trashed_with` if you can read that item's type. |
| `metadata`      | `object` or `null`                             | The item's tags and extensions after the change, or before it on `item.purged`, with only the namespaces you can read. A webhook sends `null`.                                     |
| `restored_with` | `string`                                       | On `item.restored` of an item another item's restore brought back: the ID of that item, if you can read its type.                                                                  |
| `listed`        | `boolean`                                      | Only on a copy stream: `true` if the item is in the set you can list, `false` if you can read it only by ID.                                                                       |

## Rows event fields

| Field              | Kind                | Description                                                                                                                                           |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event_type`       | `string`            | The event, which is also the frame's `event:`.                                                                                                        |
| `item`             | `object`            | The item whose rows changed.                                                                                                                          |
| `table`            | `string`            | The name of the table.                                                                                                                                |
| `batch`            | `string`            | The ID of the batch.                                                                                                                                  |
| `undoes`           | `string`            | Present when the batch is an undo: the ID of the batch it undid.                                                                                      |
| `last_activity_at` | `string`            | The time of the batch, in UTC. An item that held a later `last_activity_at` keeps it.                                                                 |
| `values_included`  | `boolean`           | Present, as `false`, when the batch's values were too large to carry: each entry of `rows` then holds only its `id`, and `deleted` for a removed row. |
| `rows`             | `array` of `object` | Each row the batch changed, as the batch left it, or with `deleted` `true` for a removed row. A row changed at `last_activity_at`.                    |

## Edge event fields

| Field         | Kind                                           | Description                                                              |
| ------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `event_type`  | `string`                                       | The event, which is also the frame's `event:`.                           |
| `edge`        | [`Edge`](/catalog/edges#fields-every-edge-has) | The edge after the change, or before it for `edge.deleted`.              |
| `from_type`   | `string`                                       | The type of the item the edge points from when the event happened.       |
| `purged_with` | `string`                                       | On `edge.deleted` of an edge a purge removed: the ID of the purged item. |

## Attention event fields

| Field        | Kind     | Description                                                                |
| ------------ | -------- | -------------------------------------------------------------------------- |
| `event_type` | `string` | The event, which is also the frame's `event:`.                             |
| `attention`  | `object` | The new entry: its kind and reference, with a sentence fixed for its kind. |

## Item webhook delivery fields

| Field          | Kind     | Description                                                                      |
| -------------- | -------- | -------------------------------------------------------------------------------- |
| `event_id`     | `string` | The event's ID in the log, the same as its `id:` on `GET /events`.               |
| `delivery_id`  | `string` | The ID of the delivery, the same on every attempt. Use it to recognize a repeat. |
| `delivered_at` | `string` | When Marfa sent this attempt, in UTC.                                            |

## Rows webhook delivery fields

| Field          | Kind     | Description                                                                      |
| -------------- | -------- | -------------------------------------------------------------------------------- |
| `event_id`     | `string` | The event's ID in the log, the same as its `id:` on `GET /events`.               |
| `delivery_id`  | `string` | The ID of the delivery, the same on every attempt. Use it to recognize a repeat. |
| `delivered_at` | `string` | When Marfa sent this attempt, in UTC.                                            |

## Edge webhook delivery fields

| Field          | Kind     | Description                                                                      |
| -------------- | -------- | -------------------------------------------------------------------------------- |
| `event_id`     | `string` | The event's ID in the log, the same as its `id:` on `GET /events`.               |
| `delivery_id`  | `string` | The ID of the delivery, the same on every attempt. Use it to recognize a repeat. |
| `delivered_at` | `string` | When Marfa sent this attempt, in UTC.                                            |

## Attention webhook delivery fields

| Field          | Kind     | Description                                                                                                                                                                                               |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event_id`     | `string` | The event's ID in the log, the same as its `id:` on `GET /events`. Absent from a delivery of a fault sent while the database fails, which no log holds, no delivery list shows and nothing can redeliver. |
| `delivery_id`  | `string` | The ID of the delivery, the same on every attempt. Use it to recognize a repeat.                                                                                                                          |
| `delivered_at` | `string` | When Marfa sent this attempt, in UTC.                                                                                                                                                                     |

## Stream frame fields

| Frame               | Field             | Kind               | Description                                                                                                                                                                         |
| ------------------- | ----------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stream_cursor`     | `cursor`          | `string`           | The ID of the latest event in the log, or `0` if it's empty. Read state after this frame, and you can resume from this ID without missing a change.                                 |
| `stream_cursor`     | `instance_id`     | `string`           | Only on a copy stream: the instance's ID, as `GET /` returns it.                                                                                                                    |
| `stream_cursor`     | `reach`           | `string`           | Only on a copy stream: the reach to send as `X-Marfa-Reach`, to resume or to read the working copy's data.                                                                          |
| `stream_live`       | `cursor`          | `string` or `null` | A position you can resume from without receiving again what the catch-up covered. `null` only on a copy stream, when Marfa couldn't read the log in time and had nothing to replay. |
| `stream_live`       | `instance_id`     | `string`           | Only on a copy stream: the instance's ID, as `GET /` returns it.                                                                                                                    |
| `stream_live`       | `reach`           | `string`           | Only on a copy stream: the reach to send as `X-Marfa-Reach`, to resume or to read the working copy's data.                                                                          |
| `stream_incomplete` | `reason`          | `string`           | `credential_ended`: your credential ended. `read_failed`: Marfa couldn't read the log or your credential. `server_stopping`: Marfa is stopping.                                     |
| `stream_incomplete` | `cursor`          | `string` or `null` | The ID of the last event the stream sent, or `null` if it sent none.                                                                                                                |
| `catchup_too_old`   | `min_retained_id` | `string`           | The ID of the oldest event the log still holds.                                                                                                                                     |
| `catchup_too_old`   | `requested`       | `string`           | The `Last-Event-ID` you sent, or the ID of the latest event when you sent none.                                                                                                     |
| `cursor_ahead`      | `requested`       | `string`           | The `Last-Event-ID` you sent.                                                                                                                                                       |
| `cursor_ahead`      | `head`            | `string`           | The ID of the latest event in the log.                                                                                                                                              |
| `reach_changed`     | None              |                    |                                                                                                                                                                                     |
