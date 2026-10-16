| Field        | Kind     | Description                                                                                |
| ------------ | -------- | ------------------------------------------------------------------------------------------ |
| `id`         | `string` | Unique identifier for the edge.                                                            |
| `source_id`  | `string` | The ID of the item the edge starts from.                                                   |
| `target_id`  | `string` | The ID of the item the edge points to.                                                     |
| `edge_type`  | `string` | The identifier of the edge type, such as `parent-of`.                                      |
| `properties` | `object` | The edge's properties, by name.                                                            |
| `created_at` | `string` | When the edge was created, in UTC.                                                         |
| `updated_at` | `string` | When the edge last changed, in UTC.                                                        |
| `version`    | `number` | The edge's version. It goes up by one on every update, including one that changes nothing. |
