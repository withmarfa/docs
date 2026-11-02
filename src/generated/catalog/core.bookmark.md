## Fields

| Field          | Kind               | Description                                                      |
| -------------- | ------------------ | ---------------------------------------------------------------- |
| `url`          | `url`              | The address of the page you saved. Label: URL.                   |
| `body`         | `string`           | The text you captured, such as a highlight, excerpt or clipping. |
| `title`        | `string`           | The title of the saved content.                                  |
| `description`  | `string`           | A short summary of the saved content.                            |
| `source_url`   | `url`              | Where the content was sourced from. Label: Source URL.           |
| `source_title` | `string`           | Title of the source.                                             |
| `author`       | `string`           | Who created the original content.                                |
| `published_at` | `datetime`         | When the original content was published. Label: Published.       |
| `image_url`    | `url`              | Preview image. Label: Image URL.                                 |
| `language`     | `string` (`bcp47`) | BCP 47 language code.                                            |
| `notes`        | `string`           | Your own comments, kept apart from the saved content.            |

## Settings

| Setting                                            | Value                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `plural`                                           | Bookmarks                                                                           |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                                                                             |
| [`body_field`](/catalog/type-rules#display-hints)  | `body`                                                                              |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:bookmark`                                                                   |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
