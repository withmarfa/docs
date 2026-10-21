## Fields

| Field          | Kind               | Required | Description                                       |
| -------------- | ------------------ | -------- | ------------------------------------------------- |
| `url`          | `url`              | No       | The saved URL                                     |
| `body`         | `string`           | No       | Captured text (a highlight, excerpt, or clipping) |
| `title`        | `string`           | No       | Title of the saved content                        |
| `description`  | `string`           | No       | Summary                                           |
| `source_url`   | `url`              | No       | Where the content was sourced from                |
| `source_title` | `string`           | No       | Title of the source                               |
| `author`       | `string`           | No       | Who created the original content                  |
| `published_at` | `datetime`         | No       | When the original content was published           |
| `image_url`    | `url`              | No       | Preview image                                     |
| `language`     | `string` (`bcp47`) | No       | BCP 47 language code                              |
| `notes`        | `string`           | No       | Personal annotations                              |

## Settings

| Setting                                                | Value                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`title_field`](/catalog/your-own-types#fields)        | `title`                                                                             |
| [`body_field`](/catalog/your-own-types#fields)         | `body`                                                                              |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
