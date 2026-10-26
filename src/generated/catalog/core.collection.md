## Fields

| Field         | Kind     | Required | Description                 |
| ------------- | -------- | -------- | --------------------------- |
| `title`       | `string` | Yes      | Name of the collection      |
| `description` | `string` | No       | What the collection gathers |

## Settings

| Setting                                                | Value                              |
| ------------------------------------------------------ | ---------------------------------- |
| [`title_field`](/catalog/your-own-types#fields)        | `title`                            |
| [`body_field`](/catalog/your-own-types#fields)         | `description`                      |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `last_writer_wins` for every field |
| [`roles`](/catalog/your-own-types#roles)               | `container`                        |
