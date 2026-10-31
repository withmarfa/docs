## Fields

| Field          | Label      | Kind               | Required | Description                                       |
| -------------- | ---------- | ------------------ | -------- | ------------------------------------------------- |
| `url`          | URL        | `url`              | No       | The saved URL                                     |
| `body`         |            | `string`           | No       | Captured text (a highlight, excerpt, or clipping) |
| `title`        |            | `string`           | No       | Title of the saved content                        |
| `description`  |            | `string`           | No       | Summary                                           |
| `source_url`   | Source URL | `url`              | No       | Where the content was sourced from                |
| `source_title` |            | `string`           | No       | Title of the source                               |
| `author`       |            | `string`           | No       | Who created the original content                  |
| `published_at` | Published  | `datetime`         | No       | When the original content was published           |
| `image_url`    | Image URL  | `url`              | No       | Preview image                                     |
| `language`     |            | `string` (`bcp47`) | No       | BCP 47 language code                              |
| `notes`        |            | `string`           | No       | Personal annotations                              |

## Settings

| Setting                                                | Value                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `plural`                                               | Bookmarks                                                                           |
| [`title_field`](/catalog/your-own-types#display-hints) | `title`                                                                             |
| [`body_field`](/catalog/your-own-types#display-hints)  | `body`                                                                              |
| [`icon`](/catalog/your-own-types#display-hints)        | `lucide:bookmark`                                                                   |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
