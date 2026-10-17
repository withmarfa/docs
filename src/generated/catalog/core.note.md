## Fields

| Field      | Kind               | Required | Description          |
| ---------- | ------------------ | -------- | -------------------- |
| `body`     | `string`           | Yes      | The note text        |
| `title`    | `string`           |          | Heading or title     |
| `language` | `string` (`bcp47`) |          | BCP 47 language code |
| `notes`    | `string`           |          | Personal annotations |

## Settings

| Setting                                                | Value                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`title_field`](/catalog/your-own-types#fields)        | `title`                                                                             |
| [`body_field`](/catalog/your-own-types#fields)         | `body`                                                                              |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
