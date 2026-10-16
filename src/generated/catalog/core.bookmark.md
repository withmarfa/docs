- **Type:** `core.bookmark`
- **Required:** None
- **Title field:** `title`
- **Body field:** `body`
- **[Merge policy](/catalog/your-own-types#merge-policy):** `body` and `notes` `keep_both_copies`; every other field `last_writer_wins`

| Field          | Kind               | Required | Description                                       |
| -------------- | ------------------ | -------- | ------------------------------------------------- |
| `url`          | `url`              |          | The saved URL                                     |
| `body`         | `string`           |          | Captured text (a highlight, excerpt, or clipping) |
| `title`        | `string`           |          | Title of the saved content                        |
| `description`  | `string`           |          | Summary                                           |
| `source_url`   | `url`              |          | Where the content was sourced from                |
| `source_title` | `string`           |          | Title of the source                               |
| `author`       | `string`           |          | Who created the original content                  |
| `published_at` | `datetime`         |          | When the original content was published           |
| `image_url`    | `url`              |          | Preview image                                     |
| `language`     | `string` (`bcp47`) |          | BCP 47 language code                              |
| `notes`        | `string`           |          | Personal annotations                              |
