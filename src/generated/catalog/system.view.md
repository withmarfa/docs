## Fields

| Field   | Kind                | Description                                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` | `string`, required  | The view's name.                                                                                                                                                                                                                                                                                                                                                                      |
| `query` | `object`            | Which items the view lists. `types`: type identifiers, each with its subtypes; empty or absent lists every type the reading key reads. `tier`: `library`, `feed` or `all`; absent is `all`. `state`: `active`, `archived` or both; absent is both. `filter`: an expression in the listing grammar's `filter`. `beneath`: an item id; the item and everything under it by `parent-of`. |
| `sort`  | `array` of `object` | The keys the view sorts by, first key first. Each is a `by` field and a `direction`, `asc` or `desc`.                                                                                                                                                                                                                                                                                 |
| `group` | `object`            | How the view groups the items it lists: `by` (a field, or `edge[<type>]` or `backref[<type>]`), and optionally `bucket` (`day`, `week`, `month` or `year`, for a date field), `order` (the values whose groups come first) and `hidden` (the values whose groups are left out).                                                                                                       |

## Settings

| Setting  | Value |
| -------- | ----- |
| `plural` | Views |
