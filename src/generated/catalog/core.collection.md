## Fields

| Field         | Kind               | Description                 |
| ------------- | ------------------ | --------------------------- |
| `title`       | `string`, required | The name of the collection. |
| `description` | `string`           | What the collection is for. |

## Settings

| Setting                                                 | Value                              |
| ------------------------------------------------------- | ---------------------------------- |
| `plural`                                                | Collections                        |
| [`title_field`](/catalog/type-definition#display-hints) | `title`                            |
| [`body_field`](/catalog/type-definition#display-hints)  | `description`                      |
| [`icon`](/catalog/type-definition#display-hints)        | `lucide:layers`                    |
| [`merge_policy`](/catalog/type-definition#merge-policy) | `last_writer_wins` for every field |
| [`roles`](/catalog/type-definition#roles)               | `container`                        |
