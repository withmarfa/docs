- **Type:** `core.bookmark`
- **Required:** None
- **Title field:** `title`
- **Body field:** `body`
- **Collisions:** `body` and `notes` [keep both copies](/guides/write-safely#let-marfa-resolve-it): the item keeps its value and the other writer's value goes to a new item tagged `conflicted-copy`. Every other field takes the last writer's value.

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
