## Fields

| Field         | Kind               | Description                  |
| ------------- | ------------------ | ---------------------------- |
| `title`       | `string`, required | Name of the collection.      |
| `description` | `string`           | What the collection gathers. |

## Settings

| Setting                                            | Value                              |
| -------------------------------------------------- | ---------------------------------- |
| `plural`                                           | Collections                        |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                            |
| [`body_field`](/catalog/type-rules#display-hints)  | `description`                      |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:layers`                    |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `last_writer_wins` for every field |
| [`roles`](/catalog/type-rules#roles)               | `container`                        |
