## Fields

| Field         | Kind               | Description                                                                                                                                                                                                                                           |
| ------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `string`, required | The name of the table.                                                                                                                                                                                                                                |
| `description` | `string`           | What the table is for.                                                                                                                                                                                                                                |
| `columns`     | `object`, required | The table's columns, by name. A column has a `type` and may have a `label`, `description`, `required`, `enum_values`, `format`, `max_length`, `minimum`, `maximum`, `type_constraints`, `adds_up` and `searchable`, as a column a type declares does. |

## Settings

| Setting                                            | Value                              |
| -------------------------------------------------- | ---------------------------------- |
| `plural`                                           | Tables                             |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                            |
| [`body_field`](/catalog/type-rules#display-hints)  | `description`                      |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:table`                     |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `last_writer_wins` for every field |
