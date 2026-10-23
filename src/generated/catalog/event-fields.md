## Item event fields

| Field           | Kind                                           | Description                                                                                                                                                                        |
| --------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event_type`    | `string`                                       | The event, which is also the frame's `event:`.                                                                                                                                     |
| `item`          | [`Item`](/catalog/items#fields-every-item-has) | The item after the change. On `item.deleted` and `item.purged` of an item a cascade trashed, it carries `trashed_by_cascade`, and `trashed_with` if you can read that item's type. |
| `metadata`      | `object` or `null`                             | The item's tags and extensions after the change, with only the namespaces you can read. The stream leaves it out when the event carries none, and a webhook sends `null`.          |
| `restored_with` | `string`                                       | On `item.restored` of an item another item's restore brought back: the ID of that item, if you can read its type.                                                                  |
| `listed`        | `boolean`                                      | Only on a copy stream: `true` if the item is in the set you can list, `false` if you can read it only by ID.                                                                       |

## Edge event fields

| Field         | Kind                                           | Description                                                              |
| ------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `event_type`  | `string`                                       | The event, which is also the frame's `event:`.                           |
| `edge`        | [`Edge`](/catalog/edges#fields-every-edge-has) | The edge after the change, or before it for `edge.deleted`.              |
| `source_type` | `string`                                       | The type of the edge's source item when the event happened.              |
| `purged_with` | `string`                                       | On `edge.deleted` of an edge a purge removed: the ID of the purged item. |

## Webhook delivery fields

| Field          | Kind     | Description                                                                      |
| -------------- | -------- | -------------------------------------------------------------------------------- |
| `event_id`     | `string` | The event's ID in the log, the same as its `id:` on `GET /events`.               |
| `delivery_id`  | `string` | The ID of the delivery, the same on every attempt. Use it to recognize a repeat. |
| `delivered_at` | `string` | When Marfa sent this attempt, in UTC.                                            |

## Stream frame fields

| Frame               | Field             | Kind               | Description                                                                                                                                                                                                                                         |
| ------------------- | ----------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stream_cursor`     | `cursor`          | `string`           | The ID of the latest event in the log, or `0` if it's empty. Read state after this frame, and you can resume from this ID without missing a change.                                                                                                 |
| `stream_cursor`     | `instance_id`     | `string`           | Only on a copy stream: the instance's ID, as `GET /` returns it.                                                                                                                                                                                    |
| `stream_cursor`     | `reach`           | `string`           | Only on a copy stream: the reach to send as `X-Marfa-Reach`, to resume or to read the working copy's data.                                                                                                                                          |
| `stream_live`       | `cursor`          | `string` or `null` | A position you can resume from without receiving again what the catch-up covered. `null` only when Marfa couldn't read the log in time and had nothing to replay.                                                                                   |
| `stream_live`       | `instance_id`     | `string`           | Only on a copy stream: the instance's ID, as `GET /` returns it.                                                                                                                                                                                    |
| `stream_live`       | `reach`           | `string`           | Only on a copy stream: the reach to send as `X-Marfa-Reach`, to resume or to read the working copy's data.                                                                                                                                          |
| `stream_incomplete` | `reason`          | `string`           | `replay_failed`: catch-up failed. `backlog_overflow`: changes piled up as it opened. `live_delivery_failed`: live events failed. `credential_ended`: your credential ended. `reader_behind`: you fell behind. `server_stopping`: Marfa is stopping. |
| `stream_incomplete` | `cursor`          | `string` or `null` | The ID of the last event the stream sent, or `null` if it sent none.                                                                                                                                                                                |
| `catchup_too_old`   | `min_retained_id` | `string`           | The ID of the oldest event the log still holds.                                                                                                                                                                                                     |
| `catchup_too_old`   | `requested`       | `string`           | The `Last-Event-ID` you sent.                                                                                                                                                                                                                       |
| `cursor_ahead`      | `requested`       | `string`           | The `Last-Event-ID` you sent.                                                                                                                                                                                                                       |
| `cursor_ahead`      | `head`            | `string`           | The ID of the latest event in the log.                                                                                                                                                                                                              |
| `reach_changed`     | None              |                    |                                                                                                                                                                                                                                                     |
