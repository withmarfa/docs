## Fields

| Field         | Kind     | Required | Description                 |
| ------------- | -------- | -------- | --------------------------- |
| `title`       | `string` | Yes      | Name of the collection      |
| `description` | `string` | No       | What the collection gathers |

## Settings

| Setting                                                | Value                              |
| ------------------------------------------------------ | ---------------------------------- |
| `plural`                                               | Collections                        |
| [`title_field`](/catalog/your-own-types#display-hints) | `title`                            |
| [`body_field`](/catalog/your-own-types#display-hints)  | `description`                      |
| [`icon`](/catalog/your-own-types#display-hints)        | `lucide:layers`                    |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `last_writer_wins` for every field |
| [`roles`](/catalog/your-own-types#roles)               | `container`                        |
