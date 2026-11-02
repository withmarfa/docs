## Fields

| Field   | Kind                | Description                                                                                                                                       |
| ------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` | `string`, required  | The view's name.                                                                                                                                  |
| `query` | `object`            | Which items the view lists, chosen by type, tier, state, a filter or a position under an item.                                                    |
| `sort`  | `array` of `object` | The keys the view sorts by, first key first. Each has a `by` field and a `direction`, `asc` or `desc`.                                            |
| `group` | `object`            | How the view groups its items: by a field or an edge, optionally in day, week, month or year buckets, with the group order and any hidden groups. |

## Settings

| Setting  | Value |
| -------- | ----- |
| `plural` | Views |
