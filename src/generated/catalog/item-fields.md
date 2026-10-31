### Identity

| Field  | Kind     | Description                                                                                              |
| ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `id`   | `string` | Unique identifier for the item.                                                                          |
| `type` | `string` | The item's type identifier, such as `core.note`.                                                         |
| `tier` | `enum`   | The item's tier. It doesn't apply to `system.*` items, which carry `library`. Values: `library`, `feed`. |

### Content

| Field        | Kind     | Description                                                                                                                                                                                                                                                |
| ------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `properties` | `object` | The item's properties, by name.                                                                                                                                                                                                                            |
| `edges`      | `object` | The item's outbound edges you can read, by edge type, each the first page that `GET /items/{id}/edges` continues. Empty if `source_filter` leaves the item out. Absent where an operation doesn't return edges, such as a listing without `include=edges`. |
| `extensions` | `object` | The item's extension namespaces that you can read, each mapped to its data. Present only where `include` names `extensions`.                                                                                                                               |

### Origin

| Field               | Kind     | Description                                                                                                      |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `source`            | `string` | The source the item was written under: the writer's own, or one its key claims. It never changes.                |
| `source_id`         | `string` | The item's identifier at its source. With `source`, it is the item's natural key. Absent if the writer set none. |
| `capture_latitude`  | `number` | The latitude where the item was captured. Absent if the writer set none.                                         |
| `capture_longitude` | `number` | The longitude where the item was captured. Absent if the writer set none.                                        |

### State

| Field                | Kind               | Description                                                                                                                                                                                                                                               |
| -------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`              | `enum`             | The item's lifecycle state. Values: `active`, `archived`, `trashed`, `revoked`.                                                                                                                                                                           |
| `trashed_at`         | `string` or `null` | When the item went to the trash, in UTC, or when a `system.*` item was revoked. A later write to the item leaves it as it is, and a restore clears it. `null` for an item outside the trash, and for one an archive restored to the trash without a time. |
| `trashed_by_cascade` | `boolean`          | Always `true` where present: the item went to the trash with another item, through a cascading edge such as `parent-of`. Present while it stays in the trash. Absent on an item trashed on its own.                                                       |
| `trashed_with`       | `string`           | The ID of the item whose trash took this one into the trash, beside `trashed_by_cascade`, whatever became of that item since. Present only if you can read that item's type.                                                                              |

### Version

| Field            | Kind      | Description                                                                                                                                                                                                     |
| ---------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`        | `integer` | The item's version. It starts at 1 and goes up by one on each update to the item's properties, `tier`, `occurred_at`, `source_id` or type. A change to its state, tags, extensions or edges leaves it as it is. |
| `schema_version` | `integer` | The `version` the item's type had when the item was created. Marfa never changes it, even when the item moves to another type, and doesn't act on it.                                                           |

### Time

| Field         | Kind     | Description                                                                    |
| ------------- | -------- | ------------------------------------------------------------------------------ |
| `occurred_at` | `string` | When the item happened, in UTC. Defaults to when it was created.               |
| `created_at`  | `string` | When the item was created, in UTC.                                             |
| `updated_at`  | `string` | When the item was last written, in UTC. A tag or extension write moves it too. |
